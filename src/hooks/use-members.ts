'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { MemberDto, Page } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

const loadAll = async (workspaceId: string) => {
  const all: MemberDto[] = [];
  let cursor: string | null = '';
  for (let i = 0; i < 20 && cursor !== null; i++) {
    const page: Page<MemberDto> = await api(`/workspaces/${workspaceId}/members?limit=100&status=all${cursor ? `&cursor=${cursor}` : ''}`);
    all.push(...page.items);
    cursor = page.nextCursor;
  }
  return all;
};

export const useMembers = () => {
  const { id } = useWorkspace();
  const query = useQuery({ queryKey: qk.members(id), queryFn: () => loadAll(id), staleTime: 60_000 });
  const byUserId = useMemo(() => new Map((query.data ?? []).map((m) => [m.userId, m])), [query.data]);
  const active = useMemo(() => (query.data ?? []).filter((m) => !m.deactivatedAt), [query.data]);
  return { ...query, members: active, byUserId };
};

export const useMemberName = () => {
  const { byUserId } = useMembers();
  return (userId: string) => byUserId.get(userId)?.name ?? 'Unknown';
};
