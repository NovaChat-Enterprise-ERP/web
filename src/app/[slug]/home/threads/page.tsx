'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import type { Page, ThreadSummaryDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useConversationTitle } from '@/hooks/use-conversations';
import { useMembers } from '@/hooks/use-members';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export default function ThreadsPage() {
  const { id, slug } = useWorkspace();
  const { byUserId } = useMembers();
  const title = useConversationTitle();
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: qk.threads(id),
    queryFn: ({ pageParam }) => api<Page<ThreadSummaryDto>>(`/workspaces/${id}/threads?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const threads = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <MessageSquareText className="size-5" /> Threads
        </h1>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading threads…</p>}
        {!isLoading && threads.length === 0 && (
          <p className="text-sm text-muted-foreground">Threads you start or reply to will show up here.</p>
        )}
        {threads.map(({ root, conversation, unread }) => {
          const author = byUserId.get(root.authorId);
          return (
            <Link
              key={root.id}
              href={`/${slug}/home/c/${conversation.id}?thread=${root.id}&message=${root.id}`}
              className="block rounded-xl border p-4 hover:bg-muted/50"
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {conversation.name ? `#${conversation.name}` : title({ ...conversation, participantIds: [] })}
                </span>
                {unread && <span className="rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">NEW</span>}
              </div>
              <div className="flex gap-3">
                <Avatar name={author?.name ?? '?'} src={author?.image} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{author?.name ?? 'Unknown'}</p>
                  <p className="line-clamp-2 text-sm">{root.text || 'Shared a file'}</p>
                  <p className="mt-1 text-xs text-primary">
                    {root.replyCount} {root.replyCount === 1 ? 'reply' : 'replies'}
                    {root.lastReplyAt && ` · last ${format(new Date(root.lastReplyAt), 'MMM d, h:mm a')}`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        {hasNextPage && (
          <button className="text-sm text-primary hover:underline" onClick={() => fetchNextPage()}>
            Load more
          </button>
        )}
      </div>
    </main>
  );
}
