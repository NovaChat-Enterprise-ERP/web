'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Hash } from 'lucide-react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Composer } from '@/components/chat/composer';
import { ConversationHeader } from '@/components/chat/conversation-header';
import { MessageList } from '@/components/chat/message-list';
import { ThreadPanel } from '@/components/chat/thread-panel';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useConversation, useConversationTitle, useMarkRead } from '@/hooks/use-conversations';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

function ConversationView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { id } = useWorkspace();
  const qc = useQueryClient();
  const { data: conversation, error } = useConversation(conversationId);
  const title = useConversationTitle();
  const markRead = useMarkRead();
  const threadId = search.get('thread');
  const highlight = search.get('message');

  const join = useMutation({
    mutationFn: () => api(`/workspaces/${id}/conversations/${conversationId}/join`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.conversation(id, conversationId) });
      qc.invalidateQueries({ queryKey: qk.conversations(id) });
    },
    onError: (e) => toast.error(e.message),
  });

  const isMember = !!conversation?.membership;
  const { mutate: markReadMutate } = markRead;
  const onSeen = useCallback(() => {
    if (isMember) markReadMutate(conversationId);
  }, [isMember, conversationId, markReadMutate]);

  useEffect(() => {
    if (isMember && (conversation?.membership?.unreadCount ?? 0) > 0) markReadMutate(conversationId);
  }, [isMember, conversationId, conversation?.membership?.unreadCount, markReadMutate]);

  const setThread = (rootId: string | null) => {
    const params = new URLSearchParams(search);
    if (rootId) params.set('thread', rootId);
    else params.delete('thread');
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`);
  };

  if (error) return <main className="grid flex-1 place-items-center text-muted-foreground">This conversation doesn&apos;t exist or you can&apos;t see it.</main>;
  if (!conversation) return <main className="flex-1" />;

  const isChannel = conversation.type === 'public_channel' || conversation.type === 'private_channel';
  const name = title(conversation);

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader conversation={conversation} />
        <MessageList
          key={conversationId}
          conversationId={conversationId}
          onOpenThread={setThread}
          onSeen={onSeen}
          highlightId={highlight}
          intro={
            <div className="px-5 pt-10 pb-4">
              <div className="mb-3 grid size-14 place-items-center rounded-xl bg-primary/10 text-primary">
                <Hash className="size-7" />
              </div>
              <h2 className="text-2xl font-bold">{isChannel ? `Welcome to #${name}` : name}</h2>
              <p className="mt-1 text-muted-foreground">
                {conversation.description ?? (isChannel ? 'This is the very beginning of the channel.' : 'This is the beginning of your direct message history.')}
              </p>
            </div>
          }
        />
        <div className="px-5 pb-4">
          {conversation.archivedAt ? (
            <p className="rounded-lg border bg-muted p-4 text-center text-sm text-muted-foreground">This channel is archived. It is read-only.</p>
          ) : isMember ? (
            <>
              <TypingIndicator conversationId={conversationId} />
              <Composer conversationId={conversationId} placeholder={`Message ${isChannel ? '#' : ''}${name}`} isChannel={isChannel} />
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted p-4">
              <p className="text-sm">You are viewing <strong>#{name}</strong>.</p>
              <Button onClick={() => join.mutate()} disabled={join.isPending}>
                Join channel
              </Button>
            </div>
          )}
        </div>
      </main>
      {threadId && <ThreadPanel rootId={threadId} conversationName={isChannel ? `#${name}` : name} isChannel={isChannel} onClose={() => setThread(null)} />}
    </>
  );
}

export default function ConversationPage() {
  return (
    <Suspense>
      <ConversationView />
    </Suspense>
  );
}
