'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MessageDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { cacheOps } from '@/hooks/use-messages';
import { api } from '@/lib/api';

export const useMessageActions = () => {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  const base = `/workspaces/${id}/messages`;
  const onError = (e: Error) => toast.error(e.message);
  const ref = (m: MessageDto) => ({ conversationId: m.conversationId, messageId: m.id, parentId: m.parentId });

  return {
    react: useMutation({
      mutationFn: ({ message, emoji, add }: { message: MessageDto; emoji: string; add: boolean }) =>
        add
          ? api<MessageDto>(`${base}/${message.id}/reactions`, { method: 'POST', body: { emoji } })
          : api<MessageDto>(`${base}/${message.id}/reactions/${encodeURIComponent(emoji)}`, { method: 'DELETE' }),
      onSuccess: (m) => cacheOps.reactions(qc, id, ref(m), m.reactions),
      onError,
    }),
    edit: useMutation({
      mutationFn: ({ message, text }: { message: MessageDto; text: string }) =>
        api<MessageDto>(`${base}/${message.id}`, { method: 'PATCH', body: { text, mentions: message.mentions, mentionsChannel: message.mentionsChannel } }),
      onSuccess: (m) => cacheOps.update(qc, id, m),
      onError,
    }),
    remove: useMutation({
      mutationFn: (message: MessageDto) => api(`${base}/${message.id}`, { method: 'DELETE' }).then(() => message),
      onSuccess: (m) => cacheOps.remove(qc, id, ref(m)),
      onError,
    }),
    pin: useMutation({
      mutationFn: ({ message, pinned }: { message: MessageDto; pinned: boolean }) =>
        api<MessageDto>(`${base}/${message.id}/pin`, { method: pinned ? 'POST' : 'DELETE' }),
      onSuccess: (m) => {
        cacheOps.update(qc, id, m);
        qc.invalidateQueries({ queryKey: ['pins', id, m.conversationId] });
      },
      onError,
    }),
  };
};
