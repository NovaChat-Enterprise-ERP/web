'use client';

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { AttachmentDto, MessageDto, Page, ReactionDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

type Pages = InfiniteData<Page<MessageDto>, string>;

const sameMessage = (a: MessageDto, b: MessageDto) =>
  a.id === b.id || (!!a.clientMsgId && a.clientMsgId === b.clientMsgId && a.authorId === b.authorId);

const mapPages = (data: Pages | undefined, fn: (m: MessageDto) => MessageDto): Pages | undefined =>
  data && { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map(fn) })) };

export const cacheOps = {
  insertRoot(qc: QueryClient, wid: string, message: MessageDto) {
    qc.setQueryData<Pages>(qk.messages(wid, message.conversationId), (data) => {
      if (!data) return data;
      if (data.pages.some((p) => p.items.some((m) => sameMessage(m, message)))) {
        return mapPages(data, (m) => (sameMessage(m, message) ? message : m));
      }
      const [first, ...rest] = data.pages;
      return { ...data, pages: [{ ...first!, items: [message, ...first!.items] }, ...rest] };
    });
  },
  insertReply(qc: QueryClient, wid: string, message: MessageDto) {
    const rootId = message.parentId!;
    qc.setQueryData<Pages>(qk.replies(wid, rootId), (data) => {
      if (!data) return data;
      if (data.pages.some((p) => p.items.some((m) => sameMessage(m, message)))) {
        return mapPages(data, (m) => (sameMessage(m, message) ? message : m));
      }
      const pages = [...data.pages];
      const last = pages.at(-1)!;
      pages[pages.length - 1] = { ...last, items: [...last.items, message] };
      return { ...data, pages };
    });
  },
  bumpRoot(qc: QueryClient, wid: string, message: MessageDto) {
    if (!message.parentId || message.id.startsWith('tmp-')) return;
    const patch = (m: MessageDto) =>
      m.id === message.parentId
        ? {
            ...m,
            replyCount: m.replyCount + 1,
            lastReplyAt: message.createdAt,
            replyUserIds: [...m.replyUserIds.filter((u) => u !== message.authorId), message.authorId].slice(-4),
          }
        : m;
    qc.setQueryData<Pages>(qk.messages(wid, message.conversationId), (d) => mapPages(d, patch));
    qc.setQueryData<MessageDto>(qk.message(wid, message.parentId), (m) => (m ? patch(m) : m));
  },
  update(qc: QueryClient, wid: string, message: MessageDto) {
    const swap = (m: MessageDto) => (m.id === message.id ? message : m);
    qc.setQueryData<Pages>(qk.messages(wid, message.conversationId), (d) => mapPages(d, swap));
    if (message.parentId) qc.setQueryData<Pages>(qk.replies(wid, message.parentId), (d) => mapPages(d, swap));
    qc.setQueryData<MessageDto>(qk.message(wid, message.id), (m) => (m ? message : m));
  },
  patch(qc: QueryClient, wid: string, ref: { conversationId: string; messageId: string; parentId: string | null }, fn: (m: MessageDto) => MessageDto) {
    const apply = (m: MessageDto) => (m.id === ref.messageId ? fn(m) : m);
    qc.setQueryData<Pages>(qk.messages(wid, ref.conversationId), (d) => mapPages(d, apply));
    if (ref.parentId) qc.setQueryData<Pages>(qk.replies(wid, ref.parentId), (d) => mapPages(d, apply));
    qc.setQueryData<MessageDto>(qk.message(wid, ref.messageId), (m) => (m ? apply(m) : m));
  },
  remove(qc: QueryClient, wid: string, ref: { conversationId: string; messageId: string; parentId: string | null }) {
    const drop = (d: Pages | undefined) =>
      d && { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.filter((m) => m.id !== ref.messageId || m.replyCount > 0) })) };
    cacheOps.patch(qc, wid, ref, (m) => ({ ...m, text: '', body: null, attachments: [], deletedAt: new Date().toISOString() }));
    qc.setQueryData<Pages>(qk.messages(wid, ref.conversationId), drop);
    if (ref.parentId) qc.setQueryData<Pages>(qk.replies(wid, ref.parentId), drop);
  },
  reactions(qc: QueryClient, wid: string, ref: { conversationId: string; messageId: string; parentId: string | null }, reactions: ReactionDto[]) {
    cacheOps.patch(qc, wid, ref, (m) => ({ ...m, reactions }));
  },
};

export const useMessages = (conversationId: string) => {
  const { id } = useWorkspace();
  return useInfiniteQuery({
    queryKey: qk.messages(id, conversationId),
    queryFn: ({ pageParam }) =>
      api<Page<MessageDto>>(`/workspaces/${id}/conversations/${conversationId}/messages?limit=40${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: Infinity,
  });
};

export const useReplies = (rootId: string) => {
  const { id } = useWorkspace();
  return useInfiniteQuery({
    queryKey: qk.replies(id, rootId),
    queryFn: ({ pageParam }) => api<Page<MessageDto>>(`/workspaces/${id}/messages/${rootId}/replies?limit=100${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: Infinity,
  });
};

export interface SendInput {
  conversationId: string;
  text: string;
  mentions: string[];
  mentionsChannel: boolean;
  parentId?: string;
  attachments?: AttachmentDto[];
}

export const useSendMessage = () => {
  const { id } = useWorkspace();
  const { data: session } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, clientMsgId }: { input: SendInput; clientMsgId: string }) =>
      api<MessageDto>(`/workspaces/${id}/conversations/${input.conversationId}/messages`, {
        method: 'POST',
        body: {
          text: input.text,
          mentions: input.mentions,
          mentionsChannel: input.mentionsChannel,
          parentId: input.parentId,
          attachments: input.attachments ?? [],
          clientMsgId,
        },
      }),
    onMutate: ({ input, clientMsgId }) => {
      const optimistic: MessageDto = {
        id: `tmp-${clientMsgId}`,
        workspaceId: id,
        conversationId: input.conversationId,
        authorId: session?.user.id ?? '',
        parentId: input.parentId ?? null,
        kind: 'user',
        body: null,
        text: input.text,
        attachments: input.attachments ?? [],
        mentions: input.mentions,
        mentionsChannel: input.mentionsChannel,
        reactions: [],
        replyCount: 0,
        lastReplyAt: null,
        replyUserIds: [],
        isPinned: false,
        clientMsgId,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
      };
      if (input.parentId) cacheOps.insertReply(qc, id, optimistic);
      else cacheOps.insertRoot(qc, id, optimistic);
    },
    onSuccess: (message) => {
      if (message.parentId) cacheOps.insertReply(qc, id, message);
      else cacheOps.insertRoot(qc, id, message);
    },
  });
};
