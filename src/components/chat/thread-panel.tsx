'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { MessageDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useReplies } from '@/hooks/use-messages';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { Composer } from './composer';
import { MessageItem } from './message-item';
import { TypingIndicator } from './typing-indicator';

export function ThreadPanel({ rootId, conversationName, isChannel, onClose }: { rootId: string; conversationName: string; isChannel: boolean; onClose: () => void }) {
  const { id } = useWorkspace();
  const { data: root } = useQuery({ queryKey: qk.message(id, rootId), queryFn: () => api<MessageDto>(`/workspaces/${id}/messages/${rootId}`) });
  const { data } = useReplies(rootId);
  const replies = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [replies.length]);

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-l">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-bold">Thread</h2>
          <p className="text-xs text-muted-foreground">{conversationName}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Close thread">
          <X className="size-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto py-3">
        {root && <MessageItem message={root} compact={false} inThread />}
        {root && root.replyCount > 0 && (
          <div className="my-2 flex items-center gap-3 px-5 text-xs text-muted-foreground">
            {root.replyCount} {root.replyCount === 1 ? 'reply' : 'replies'}
            <span className="h-px flex-1 bg-border" />
          </div>
        )}
        {replies.map((m) => (
          <MessageItem key={m.clientMsgId ?? m.id} message={m} compact={false} inThread />
        ))}
        <div ref={end} />
      </div>
      {root && (
        <div className="px-4 pb-3">
          <TypingIndicator conversationId={root.conversationId} parentId={rootId} />
          <Composer conversationId={root.conversationId} parentId={rootId} placeholder="Reply…" isChannel={isChannel} />
        </div>
      )}
    </aside>
  );
}
