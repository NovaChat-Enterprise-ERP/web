'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AtSign, Bell, MessageSquareText, PhoneCall, Smile, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ComponentType } from 'react';
import type { NotificationDto, NotificationType, Page } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SectionSidebar } from '@/components/layout/section-sidebar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useMembers } from '@/hooks/use-members';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const ICONS: Record<NotificationType, ComponentType<{ className?: string }>> = {
  mention: AtSign,
  channel_mention: Users,
  dm: MessageSquareText,
  thread_reply: MessageSquareText,
  meeting_invite: PhoneCall,
  reaction: Smile,
};

type Page2 = Page<NotificationDto> & { unreadCount: number };

export default function NotificationsPage() {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const { byUserId } = useMembers();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: [...qk.notifications(id), unreadOnly],
    queryFn: ({ pageParam }) =>
      api<Page2>(`/workspaces/${id}/notifications?limit=30&unread=${unreadOnly}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const markAll = useMutation({
    mutationFn: () => api(`/workspaces/${id}/notifications/read-all`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications(id) }),
  });

  const open = async (n: NotificationDto) => {
    if (!n.readAt) {
      await api(`/workspaces/${id}/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
      qc.invalidateQueries({ queryKey: qk.notifications(id) });
    }
    if (n.link) router.push(`/${slug}/${n.link}`);
  };

  return (
    <>
      <SectionSidebar>
        <h2 className="px-3 pb-2 text-lg font-semibold">Activity</h2>
        {(['All', 'Unread'] as const).map((label) => (
          <button
            key={label}
            onClick={() => setUnreadOnly(label === 'Unread')}
            className={cn('rounded-md px-3 py-2 text-left hover:bg-sidebar-hover', (label === 'Unread') === unreadOnly && 'bg-sidebar-hover font-semibold text-white')}
          >
            {label}
          </button>
        ))}
      </SectionSidebar>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Bell className="size-5" /> Notifications
          </h1>
          <Button size="sm" variant="outline" onClick={() => markAll.mutate()} disabled={(data?.pages[0]?.unreadCount ?? 0) === 0}>
            Mark all as read
          </Button>
        </header>
        <div className="flex-1 divide-y overflow-y-auto">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && items.length === 0 && <p className="p-6 text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {items.map((n) => {
            const Icon = ICONS[n.type];
            const actor = n.actorId ? byUserId.get(n.actorId) : undefined;
            return (
              <button key={n.id} onClick={() => open(n)} className={cn('flex w-full gap-4 px-6 py-4 text-left hover:bg-muted/50', !n.readAt && 'bg-primary/5')}>
                <span className="relative">
                  <Avatar name={actor?.name ?? n.title} src={actor?.image} className="size-10" />
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="size-3" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block', !n.readAt && 'font-semibold')}>{n.title}</span>
                  {n.body && <span className="line-clamp-2 text-sm text-muted-foreground">{n.body}</span>}
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                </span>
                {!n.readAt && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
          {hasNextPage && (
            <button className="w-full p-4 text-sm text-primary hover:underline" onClick={() => fetchNextPage()}>
              Load more
            </button>
          )}
        </div>
      </main>
    </>
  );
}
