'use client';

import { format } from 'date-fns';
import { MessageSquareText, MoreHorizontal, Pin, PhoneCall, SmilePlus } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { memo, useState } from 'react';
import { PERMISSIONS, type MessageDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Attachment } from './attachment';
import { EmojiPicker } from './emoji-picker';
import { Markdown } from './markdown';
import { useMessageActions } from './message-actions';

const menuItem = 'cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-muted';

function MeetingCard({ message }: { message: MessageDto }) {
  const { slug } = useWorkspace();
  const code = String(message.body?.code ?? '');
  return (
    <div className="mt-1 flex w-80 items-center gap-3 rounded-lg border p-3">
      <span className="grid size-10 place-items-center rounded-md bg-green-500/15 text-green-600">
        <PhoneCall className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{String(message.body?.title ?? 'Meeting')}</p>
        <p className="font-mono text-xs text-muted-foreground">{code}</p>
      </div>
      <Button size="sm" asChild>
        <Link href={`/${slug}/buzz/${code}`}>Join</Link>
      </Button>
    </div>
  );
}

export const MessageItem = memo(function MessageItem({
  message,
  compact,
  onOpenThread,
  inThread = false,
}: {
  message: MessageDto;
  compact: boolean;
  onOpenThread?: (id: string) => void;
  inThread?: boolean;
}) {
  const { permissions } = useWorkspace();
  const { byUserId } = useMembers();
  const { data: session } = useSession();
  const actions = useMessageActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  const me = session?.user.id;
  const author = byUserId.get(message.authorId);
  const name = author?.name ?? 'Unknown';
  const isMine = message.authorId === me;
  const pending = message.id.startsWith('tmp-');
  const isMention = (handle: string) => handle === 'channel' || handle === 'here' || [...byUserId.values()].some((m) => m.username === handle);
  const canDelete = isMine || permissions.includes(PERMISSIONS.MESSAGES_DELETE_ANY);
  const time = new Date(message.createdAt);

  if (message.deletedAt) {
    return (
      <div className="px-5 py-1.5 pl-[72px] text-sm italic text-muted-foreground">
        This message was deleted.
        {message.replyCount > 0 && !inThread && (
          <button className="ml-2 not-italic text-primary hover:underline" onClick={() => onOpenThread?.(message.id)}>
            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
    );
  }

  if (message.kind === 'system') {
    return (
      <div className="flex gap-3 px-5 py-2">
        <span className="w-10" />
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{name}</span> {message.text.replace(new RegExp(`^${name}\\s*`), '')}
          {message.body?.type === 'meeting' && <MeetingCard message={message} />}
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn('group relative flex gap-3 px-5 hover:bg-muted/50', compact ? 'py-0.5' : 'pt-2 pb-0.5', pending && 'opacity-60', message.isPinned && 'bg-amber-50/60 dark:bg-amber-500/5')}
    >
      <div className="w-10 shrink-0">
        {compact ? (
          <time className="invisible block pt-1 text-right text-[11px] text-muted-foreground group-hover:visible">{format(time, 'HH:mm')}</time>
        ) : (
          <Avatar name={name} src={author?.image} className="size-10" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="font-bold">{name}</span>
            <time className="text-xs text-muted-foreground" title={format(time, 'PPpp')}>
              {format(time, 'h:mm a')}
            </time>
            {message.isPinned && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Pin className="size-3" /> Pinned
              </span>
            )}
          </div>
        )}
        {editing ? (
          <div className="my-1 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-sm"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false);
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  actions.edit.mutate({ message, text: draft.trim() });
                  setEditing(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => (actions.edit.mutate({ message, text: draft.trim() }), setEditing(false))}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          message.text && (
            <div className="text-[15px]">
              <Markdown text={message.text} isMention={isMention} />
              {message.editedAt && <span className="text-xs text-muted-foreground"> (edited)</span>}
            </div>
          )
        )}
        {message.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {message.attachments.map((a) => (
              <Attachment key={a.fileId} attachment={a} />
            ))}
          </div>
        )}
        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => {
              const mine = !!me && r.userIds.includes(me);
              return (
                <button
                  key={r.emoji}
                  title={r.userIds.map((u) => byUserId.get(u)?.name ?? 'Someone').join(', ')}
                  onClick={() => actions.react.mutate({ message, emoji: r.emoji, add: !mine })}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
                    mine ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  <span className="text-sm">{r.emoji}</span> {r.count}
                </button>
              );
            })}
          </div>
        )}
        {!inThread && message.replyCount > 0 && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1 flex items-center gap-2 rounded-md py-1 pr-2 text-sm text-primary hover:bg-background"
          >
            <span className="flex -space-x-1.5">
              {message.replyUserIds.map((u) => (
                <Avatar key={u} name={byUserId.get(u)?.name ?? '?'} src={byUserId.get(u)?.image} className="size-5 ring-2 ring-background" />
              ))}
            </span>
            <span className="font-semibold">
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {message.lastReplyAt && <span className="text-xs text-muted-foreground">Last reply {format(new Date(message.lastReplyAt), 'MMM d, h:mm a')}</span>}
          </button>
        )}
      </div>

      {!pending && !editing && (
        <div className="absolute -top-4 right-4 hidden items-center rounded-md border bg-background shadow-sm group-hover:flex has-[[data-state=open]]:flex">
          <EmojiPicker
            label="Add reaction"
            onPick={(emoji) => actions.react.mutate({ message, emoji, add: true })}
            trigger={
              <button className="p-1.5 hover:bg-muted" aria-label="Add reaction">
                <SmilePlus className="size-4" />
              </button>
            }
          />
          {!inThread && onOpenThread && (
            <button className="p-1.5 hover:bg-muted" onClick={() => onOpenThread(message.id)} aria-label="Reply in thread">
              <MessageSquareText className="size-4" />
            </button>
          )}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="p-1.5 hover:bg-muted" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" className="z-50 min-w-44 rounded-lg border bg-popover p-1 shadow-lg">
                <DropdownMenu.Item className={menuItem} onSelect={() => navigator.clipboard.writeText(message.text)}>Copy text</DropdownMenu.Item>
                {!message.parentId && (
                  <DropdownMenu.Item className={menuItem} onSelect={() => actions.pin.mutate({ message, pinned: !message.isPinned })}>
                    {message.isPinned ? 'Unpin' : 'Pin to conversation'}
                  </DropdownMenu.Item>
                )}
                {isMine && (
                  <DropdownMenu.Item className={menuItem} onSelect={() => (setDraft(message.text), setEditing(true))}>Edit message</DropdownMenu.Item>
                )}
                {canDelete && (
                  <DropdownMenu.Item className={cn(menuItem, 'text-destructive')} onSelect={() => confirm('Delete this message?') && actions.remove.mutate(message)}>
                    Delete message
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
    </div>
  );
});
