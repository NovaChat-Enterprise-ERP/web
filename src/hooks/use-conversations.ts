'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConversationDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useMembers } from './use-members';

export const useConversations = () => {
  const { id } = useWorkspace();
  return useQuery({
    queryKey: qk.conversations(id),
    queryFn: () => api<{ items: ConversationDto[] }>(`/workspaces/${id}/conversations`).then((r) => r.items),
  });
};

export const useConversation = (conversationId: string) => {
  const { id } = useWorkspace();
  return useQuery({
    queryKey: qk.conversation(id, conversationId),
    queryFn: () => api<ConversationDto>(`/workspaces/${id}/conversations/${conversationId}`),
  });
};

export const useConversationTitle = () => {
  const { data: session } = useSession();
  const { byUserId } = useMembers();
  return (c: Pick<ConversationDto, 'type' | 'name' | 'participantIds'>) => {
    if (c.name) return c.name;
    const others = c.participantIds.filter((u) => u !== session?.user.id);
    if (others.length === 0) return `${byUserId.get(session?.user.id ?? '')?.name ?? 'You'} (you)`;
    return others.map((u) => byUserId.get(u)?.name ?? 'Unknown').join(', ');
  };
};

export const useMarkRead = () => {
  const { id } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => api(`/workspaces/${id}/conversations/${conversationId}/read`, { method: 'POST', body: {} }),
    onSuccess: (_d, conversationId) =>
      queryClient.setQueryData<ConversationDto[]>(qk.conversations(id), (list) =>
        list?.map((c) =>
          c.id === conversationId && c.membership
            ? { ...c, membership: { ...c.membership, unreadCount: 0, mentionCount: 0 } }
            : c,
        ),
      ),
  });
};

export const useOpenDirect = () => {
  const { id } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => api<ConversationDto>(`/workspaces/${id}/conversations/direct`, { method: 'POST', body: { userIds } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.conversations(id) }),
  });
};
