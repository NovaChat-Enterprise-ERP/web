'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
  CLIENT_EVENTS,
  SOCKET_EVENTS,
  type MessageDto,
  type NotificationDto,
  type PresencePayload,
  type ReactionDto,
  type TypingPayload,
} from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { cacheOps } from '@/hooks/use-messages';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

interface TypingEntry {
  userId: string;
  parentId: string | null;
  until: number;
}

interface RealtimeState {
  connected: boolean;
  online: Set<string>;
  typing: Map<string, TypingEntry[]>;
  sendTyping: (conversationId: string, parentId?: string | null) => void;
}

const RealtimeContext = createContext<RealtimeState>({
  connected: false,
  online: new Set(),
  typing: new Map(),
  sendTyping: () => undefined,
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<Map<string, TypingEntry[]>>(new Map());
  const wid = workspace.id;
  const { members } = useMembers();
  const memberIds = useMemo(() => members.map((m) => m.userId), [members]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:4000';
    const socket = io(url, { transports: ['websocket'], withCredentials: true, autoConnect: false, auth: { workspaceId: wid } });
    socketRef.current = socket;
    let disposed = false;
    const refreshTicket = async () => {
      try {
        const { ticket } = await api<{ ticket: string }>('/realtime/ticket');
        socket.io.opts.query = { ticket };
      } catch (error) {
        console.warn('Could not obtain a realtime ticket:', (error as Error).message);
      }
    };
    void refreshTicket().then(() => !disposed && socket.connect());
    const ticketTimer = setInterval(refreshTicket, 4 * 60_000);
    let conversationsTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshConversations = () => {
      clearTimeout(conversationsTimer);
      conversationsTimer = setTimeout(() => qc.invalidateQueries({ queryKey: qk.conversations(wid) }), 300);
    };

    socket.on('connect', () => {
      setConnected(true);
      qc.invalidateQueries({ queryKey: qk.conversations(wid) });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.warn('Realtime connection failed:', err.message));

    socket.on(SOCKET_EVENTS.MESSAGE_CREATED, (message: MessageDto) => {
      if (message.parentId) {
        cacheOps.insertReply(qc, wid, message);
        cacheOps.bumpRoot(qc, wid, message);
        qc.invalidateQueries({ queryKey: qk.threads(wid) });
      } else {
        cacheOps.insertRoot(qc, wid, message);
        refreshConversations();
      }
      setTyping((prev) => {
        const next = new Map(prev);
        next.set(message.conversationId, (next.get(message.conversationId) ?? []).filter((t) => t.userId !== message.authorId));
        return next;
      });
    });
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, (message: MessageDto) => cacheOps.update(qc, wid, message));
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, (ref: { messageId: string; conversationId: string; parentId: string | null }) =>
      cacheOps.remove(qc, wid, ref),
    );
    socket.on(
      SOCKET_EVENTS.REACTION_UPDATED,
      (data: { messageId: string; conversationId: string; parentId: string | null; reactions: ReactionDto[] }) =>
        cacheOps.reactions(qc, wid, data, data.reactions),
    );
    socket.on(SOCKET_EVENTS.CONVERSATION_UPSERTED, (data: { conversationId: string }) => {
      refreshConversations();
      qc.invalidateQueries({ queryKey: qk.conversation(wid, data.conversationId) });
    });
    socket.on(SOCKET_EVENTS.CONVERSATION_REMOVED, () => refreshConversations());
    socket.on(SOCKET_EVENTS.MEMBER_UPDATED, () => {
      qc.invalidateQueries({ queryKey: qk.members(wid) });
      qc.invalidateQueries({ queryKey: ['membership', wid] });
    });
    socket.on(SOCKET_EVENTS.WORKSPACE_UPDATED, () => qc.invalidateQueries({ queryKey: ['workspaces'] }));
    socket.on(SOCKET_EVENTS.MEETING_UPDATED, () => qc.invalidateQueries({ queryKey: qk.meetings(wid) }));
    socket.on(SOCKET_EVENTS.NOTIFICATION_CREATED, (n: NotificationDto & { silent?: boolean }) => {
      qc.invalidateQueries({ queryKey: qk.notifications(wid) });
      if (!n.silent) toast(n.title, { description: n.body ?? undefined });
    });
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATED, ({ userId, online: isOnline }: PresencePayload) =>
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      }),
    );
    socket.on(SOCKET_EVENTS.TYPING, (payload: TypingPayload & { userId: string }) =>
      setTyping((prev) => {
        const next = new Map(prev);
        const list = (next.get(payload.conversationId) ?? []).filter((t) => t.userId !== payload.userId);
        next.set(payload.conversationId, [...list, { userId: payload.userId, parentId: payload.parentId ?? null, until: Date.now() + 5_000 }]);
        return next;
      }),
    );

    const heartbeat = setInterval(() => socket.emit(CLIENT_EVENTS.PRESENCE_HEARTBEAT), 30_000);
    const sweep = setInterval(
      () =>
        setTyping((prev) => {
          const now = Date.now();
          let changed = false;
          const next = new Map<string, TypingEntry[]>();
          for (const [k, v] of prev) {
            const kept = v.filter((t) => t.until > now);
            if (kept.length !== v.length) changed = true;
            if (kept.length) next.set(k, kept);
          }
          return changed ? next : prev;
        }),
      1_000,
    );

    return () => {
      disposed = true;
      clearInterval(ticketTimer);
      clearInterval(heartbeat);
      clearInterval(sweep);
      clearTimeout(conversationsTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [wid, qc]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || memberIds.length === 0) return;
    socket.emit(CLIENT_EVENTS.PRESENCE_QUERY, memberIds, (list: string[]) => setOnline(new Set([...list, session?.user.id ?? ''])));
  }, [connected, memberIds, session?.user.id]);

  const sendTyping = useCallback((conversationId: string, parentId?: string | null) => {
    socketRef.current?.emit(CLIENT_EVENTS.TYPING, { conversationId, parentId: parentId ?? null });
  }, []);

  const value = useMemo(() => ({ connected, online, typing, sendTyping }), [connected, online, typing, sendTyping]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
