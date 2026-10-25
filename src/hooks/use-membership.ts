'use client';

import { useQuery } from '@tanstack/react-query';
import type { MemberDto } from '@novachat-enterprise-erp/contracts';
import { api } from '@/lib/api';

export const useMyMembership = (workspaceId: string) =>
  useQuery({
    queryKey: ['membership', workspaceId],
    queryFn: () => api<MemberDto>(`/workspaces/${workspaceId}/me`),
  });
