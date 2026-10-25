'use client';

import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export const useUnreadNotifications = () => {
  const { id } = useWorkspace();
  return useQuery({
    queryKey: qk.unread(id),
    queryFn: () => api<{ unreadCount: number }>(`/workspaces/${id}/notifications/unread-count`).then((r) => r.unreadCount),
    refetchInterval: 120_000,
  });
};
