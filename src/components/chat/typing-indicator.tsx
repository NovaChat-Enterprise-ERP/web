'use client';

import { useRealtime } from '@/components/realtime/realtime-provider';
import { useMembers } from '@/hooks/use-members';

export function TypingIndicator({ conversationId, parentId = null }: { conversationId: string; parentId?: string | null }) {
  const { typing } = useRealtime();
  const { byUserId } = useMembers();
  const names = (typing.get(conversationId) ?? [])
    .filter((t) => (t.parentId ?? null) === parentId)
    .map((t) => byUserId.get(t.userId)?.name.split(' ')[0] ?? 'Someone');
  const label =
    names.length === 0 ? '' : names.length === 1 ? `${names[0]} is typing…` : names.length === 2 ? `${names[0]} and ${names[1]} are typing…` : 'Several people are typing…';
  return <div className="h-5 px-1 text-xs text-muted-foreground">{label}</div>;
}
