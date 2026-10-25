'use client';

import { useQuery } from '@tanstack/react-query';
import { Hash, MessageSquareText, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog as D } from 'radix-ui';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Page, SearchResultDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useConversations, useOpenDirect } from '@/hooks/use-conversations';
import { useMembers } from '@/hooks/use-members';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Result = { key: string; icon: React.ReactNode; title: string; subtitle?: string; html?: string; go: () => void };

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const { members, byUserId } = useMembers();
  const { data: conversations = [] } = useConversations();
  const openDirect = useOpenDirect();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const query = useDeferredValue(q.trim());

  const { data: messages } = useQuery({
    queryKey: ['search', id, query],
    queryFn: () => api<Page<SearchResultDto>>(`/workspaces/${id}/search?q=${encodeURIComponent(query)}&limit=8`),
    enabled: query.length >= 2,
  });

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const results = useMemo<Result[]>(() => {
    if (!query) return [];
    const term = query.toLowerCase();
    const close = () => onOpenChange(false);
    const channels = conversations
      .filter((c) => c.name?.includes(term.replace(/^#/, '')))
      .slice(0, 4)
      .map((c) => ({ key: `c-${c.id}`, icon: <Hash className="size-4" />, title: `#${c.name}`, subtitle: 'Channel', go: () => (close(), router.push(`/${slug}/home/c/${c.id}`)) }));
    const people = members
      .filter((m) => m.name.toLowerCase().includes(term) || m.username.includes(term.replace(/^@/, '')))
      .slice(0, 5)
      .map((m) => ({
        key: `p-${m.userId}`,
        icon: <Avatar name={m.name} src={m.image} className="size-5" />,
        title: m.name,
        subtitle: `@${m.username}${m.title ? ` · ${m.title}` : ''}`,
        go: () => openDirect.mutate([m.userId], { onSuccess: (c) => (close(), router.push(`/${slug}/home/c/${c.id}`)) }),
      }));
    const found = (messages?.items ?? []).map((r) => ({
      key: `m-${r.message.id}`,
      icon: <MessageSquareText className="size-4" />,
      title: `${byUserId.get(r.message.authorId)?.name ?? 'Someone'} in ${r.conversation.name ? `#${r.conversation.name}` : 'a direct message'}`,
      html: r.highlight,
      go: () => {
        close();
        const root = r.message.parentId ?? r.message.id;
        router.push(`/${slug}/home/c/${r.conversation.id}?message=${root}${r.message.parentId ? `&thread=${root}` : ''}`);
      },
    }));
    return [...channels, ...people, ...found];
  }, [query, conversations, members, messages, byUserId, slug, router, onOpenChange, openDirect]);

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl bg-card shadow-2xl">
          <D.Title className="sr-only">Search</D.Title>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="size-5 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => (setQ(e.target.value), setActive(0))}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)));
                if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
                if (e.key === 'Enter') results[active]?.go();
              }}
              placeholder="Search messages, people and channels"
              className="h-14 flex-1 bg-transparent text-base outline-none"
            />
            <kbd className="rounded border px-1.5 text-xs text-muted-foreground">Esc</kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!query && <p className="p-4 text-sm text-muted-foreground">Type to search. Prefix with # for channels or @ for people.</p>}
            {query && results.length === 0 && <p className="p-4 text-sm text-muted-foreground">No results for “{query}”.</p>}
            {results.map((r, i) => (
              <button
                key={r.key}
                onMouseEnter={() => setActive(i)}
                onClick={r.go}
                className={cn('flex w-full items-start gap-3 rounded-md px-3 py-2 text-left', i === active && 'bg-muted')}
              >
                <span className="mt-0.5 text-muted-foreground">{r.icon ?? <User className="size-4" />}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
                  {r.html && (
                    <span
                      className="line-clamp-2 text-sm text-muted-foreground [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-500/40"
                      dangerouslySetInnerHTML={{ __html: escapeExceptMark(r.html) }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

const escapeExceptMark = (html: string) =>
  html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;mark&gt;/g, '<mark>')
    .replace(/&lt;\/mark&gt;/g, '</mark>');
