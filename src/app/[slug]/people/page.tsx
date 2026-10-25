'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { PERMISSIONS, type MemberDto, type Page } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { SectionSidebar } from '@/components/layout/section-sidebar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { InviteDialog } from '@/components/workspace/invite-dialog';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';

export default function PeoplePage() {
  const workspace = useWorkspace();
  const canInvite = useCan(PERMISSIONS.MEMBERS_INVITE);
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['members', workspace.id, query],
    queryFn: ({ pageParam }) =>
      api<Page<MemberDto>>(
        `/workspaces/${workspace.id}/members?limit=40&q=${encodeURIComponent(query)}${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const members = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <SectionSidebar>
        <h2 className="px-3 pb-2 text-lg font-semibold">People</h2>
        <p className="px-3 text-sm text-sidebar-muted">Everyone in {workspace.name}.</p>
      </SectionSidebar>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-8 py-5">
          <h1 className="text-2xl font-semibold">People</h1>
          {canInvite && <InviteDialog />}
        </header>
        <div className="px-8 py-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, username or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="grid flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 overflow-y-auto px-8 pb-8">
          {members.map((m) => (
            <article key={m.id} className="rounded-xl border p-4 transition-shadow hover:shadow-md">
              <Avatar name={m.name} src={m.image} className="mb-3 aspect-square size-auto w-full rounded-lg text-3xl" />
              <div className="flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-full ${m.isAway ? 'border border-muted-foreground' : 'bg-green-500'}`} />
                <h3 className="truncate font-semibold">{m.name}</h3>
              </div>
              <p className="truncate text-sm text-muted-foreground">@{m.username}</p>
              {m.title && <p className="truncate text-sm">{m.title}</p>}
              {m.status.text && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {m.status.emoji} {m.status.text}
                </p>
              )}
              {m.role.key !== 'member' && (
                <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{m.role.name}</span>
              )}
            </article>
          ))}
          {members.length === 0 && <p className="text-sm text-muted-foreground">No people match your search.</p>}
        </div>
        {hasNextPage && (
          <button className="pb-6 text-sm text-primary hover:underline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            Load more
          </button>
        )}
      </main>
    </>
  );
}
