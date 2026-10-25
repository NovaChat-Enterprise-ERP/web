'use client';

import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { MessageDto } from '@novachat-enterprise-erp/contracts';
import { useMessages } from '@/hooks/use-messages';
import { MessageItem } from './message-item';

const dayLabel = (d: Date) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMMM d'));

const isCompact = (prev: MessageDto | undefined, m: MessageDto) =>
  !!prev &&
  prev.authorId === m.authorId &&
  prev.kind === 'user' &&
  m.kind === 'user' &&
  !prev.deletedAt &&
  new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;

export function MessageList({
  conversationId,
  onOpenThread,
  onSeen,
  highlightId,
  intro,
}: {
  conversationId: string;
  onOpenThread: (id: string) => void;
  onSeen: () => void;
  highlightId?: string | null;
  intro: React.ReactNode;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(conversationId);
  const scroller = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousHeight = useRef(0);

  const messages = useMemo(() => (data?.pages.flatMap((p) => p.items) ?? []).slice().reverse(), [data]);
  const newestId = messages.at(-1)?.id;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    else if (previousHeight.current && el.scrollHeight > previousHeight.current && el.scrollTop < 200) {
      el.scrollTop += el.scrollHeight - previousHeight.current;
    }
    previousHeight.current = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (newestId && stickToBottom.current && document.visibilityState === 'visible') onSeen();
  }, [newestId, onSeen]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`message-${highlightId}`);
    if (!el) return;
    stickToBottom.current = false;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('ring-2', 'ring-primary/40');
    const t = setTimeout(() => el.classList.remove('ring-2', 'ring-primary/40'), 2_500);
    return () => clearTimeout(t);
  }, [highlightId, messages.length]);

  useEffect(() => {
    const target = topSentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage(),
      { root: scroller.current, rootMargin: '400px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      ref={scroller}
      className="flex-1 overflow-y-auto"
      onScroll={(e) => {
        const el = e.currentTarget;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (atBottom && !stickToBottom.current) onSeen();
        stickToBottom.current = atBottom;
      }}
    >
      <div ref={topSentinel} />
      {isFetchingNextPage && <Loader2 className="mx-auto my-3 size-5 animate-spin text-muted-foreground" />}
      {!hasNextPage && !isLoading && intro}
      {isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Loading messages…</p>}
      <div className="pb-2">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const day = new Date(m.createdAt);
          const newDay = !prev || !isSameDay(new Date(prev.createdAt), day);
          return (
            <Fragment key={m.clientMsgId ?? m.id}>
              {newDay && (
                <div className="sticky top-0 z-10 my-2 flex items-center gap-3 px-5">
                  <span className="h-px flex-1 bg-border" />
                  <span className="rounded-full border bg-background px-3 py-0.5 text-xs font-semibold">{dayLabel(day)}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <MessageItem message={m} compact={!newDay && isCompact(prev, m)} onOpenThread={onOpenThread} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
