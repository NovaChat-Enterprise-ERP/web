'use client';

import { formatDistanceToNow } from 'date-fns';
import { SquarePen } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SectionSidebar } from '@/components/layout/section-sidebar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useRealtime } from '@/components/realtime/realtime-provider';
import { useConversationTitle, useConversations } from '@/hooks/use-conversations';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function DirectMessagesPage() {
  const { slug } = useWorkspace();
  const { data: conversations = [] } = useConversations();
  const { byUserId } = useMembers();
  const { online } = useRealtime();
  const { data: session } = useSession();
  const title = useConversationTitle();
  const directs = conversations
    .filter((c) => c.type === 'dm' || c.type === 'group_dm')
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));

  return (
    <>
      <SectionSidebar>
        <div className="flex items-center justify-between px-3 pb-2">
          <h2 className="text-lg font-semibold">Direct messages</h2>
          <Link href={`/${slug}/home/people/new-chat`} className="rounded p-1 hover:bg-sidebar-hover" aria-label="New message">
            <SquarePen className="size-5" />
          </Link>
        </div>
        {directs.length === 0 && <p className="px-3 text-sm text-sidebar-muted">No conversations yet.</p>}
        {directs.map((c) => {
          const other = c.participantIds.find((u) => u !== session?.user.id) ?? '';
          const member = byUserId.get(other);
          const unread = (c.membership?.unreadCount ?? 0) > 0;
          return (
            <Link key={c.id} href={`/${slug}/home/c/${c.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-hover">
              <span className="relative">
                <Avatar name={title(c)} src={c.type === 'dm' ? member?.image : null} className="size-9" />
                {c.type === 'dm' && (
                  <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar', online.has(other) ? 'bg-green-400' : 'bg-sidebar-muted')} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate', unread && 'font-bold text-white')}>{title(c)}</span>
                {c.lastMessageAt && (
                  <span className="text-xs text-sidebar-muted">{formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}</span>
                )}
              </span>
            </Link>
          );
        })}
      </SectionSidebar>
      <main className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold">Your direct messages</h1>
          <p className="mt-2 text-muted-foreground">Pick a conversation or start a new one.</p>
          <Button asChild className="mt-6">
            <Link href={`/${slug}/home/people/new-chat`}>New message</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
