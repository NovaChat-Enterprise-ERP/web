'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { AuditLogDto, MemberDto, Page } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';

export default function AuditLogPage() {
  const workspace = useWorkspace();
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['audit', workspace.id],
    queryFn: ({ pageParam }) =>
      api<Page<AuditLogDto>>(`/workspaces/${workspace.id}/audit-logs?limit=50${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const { data: members } = useQuery({
    queryKey: ['members', workspace.id, 'all'],
    queryFn: () => api<Page<MemberDto>>(`/workspaces/${workspace.id}/members?limit=100&status=all`),
  });
  const nameOf = (userId: string) => members?.items.find((m) => m.userId === userId)?.name ?? userId;
  const entries = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section>
      <h2 className="text-xl font-semibold">Audit Log</h2>
      <p className="mt-1 text-muted-foreground">Every administrative action in {workspace.name}.</p>
      <ol className="mt-6 divide-y rounded-xl border">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-4 px-4 py-3 text-sm">
            <time className="w-40 shrink-0 text-muted-foreground">{format(new Date(e.createdAt), 'MMM d, HH:mm')}</time>
            <span className="font-medium">{nameOf(e.actorId)}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.action}</code>
            <span className="truncate text-muted-foreground">{Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : ''}</span>
          </li>
        ))}
      </ol>
      {hasNextPage && (
        <button className="mt-4 text-sm text-primary hover:underline" onClick={() => fetchNextPage()}>
          Load older entries
        </button>
      )}
    </section>
  );
}
