'use client';

import { useQuery } from '@tanstack/react-query';
import type { WorkspaceSummaryDto } from '@novachat-enterprise-erp/contracts';
import { api } from '@/lib/api';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  bySlug: (slug: string) => ['workspaces', 'slug', slug] as const,
};

export const useMyWorkspaces = () =>
  useQuery({
    queryKey: workspaceKeys.all,
    queryFn: () => api<{ items: WorkspaceSummaryDto[] }>('/workspaces').then((r) => r.items),
  });

export const useWorkspaceBySlug = (slug: string) =>
  useQuery({
    queryKey: workspaceKeys.bySlug(slug),
    queryFn: () => api<WorkspaceSummaryDto>(`/workspaces/by-slug/${slug}`),
  });
