'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, ChevronDown, Hash, Lock, PhoneCall, Pin, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DropdownMenu, Popover } from 'radix-ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { PERMISSIONS, type ConversationDto, type MeetingDto, type MessageDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useCan } from '@/hooks/use-can';
import { useConversationTitle } from '@/hooks/use-conversations';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

const menuItem = 'cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-muted';

export function ConversationHeader({ conversation }: { conversation: ConversationDto }) {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const title = useConversationTitle();
  const { byUserId, members } = useMembers();
  const { data: session } = useSession();
  const canManageAll = useCan(PERMISSIONS.CHANNELS_MANAGE);
  const canMeet = useCan(PERMISSIONS.MEETINGS_CREATE);
  const [membersOpen, setMembersOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const isChannel = conversation.type === 'public_channel' || conversation.type === 'private_channel';
  const canManage = isChannel && (conversation.createdBy === session?.user.id || canManageAll);
  const base = `/workspaces/${id}/conversations/${conversation.id}`;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.conversation(id, conversation.id) });
    qc.invalidateQueries({ queryKey: qk.conversations(id) });
    qc.invalidateQueries({ queryKey: ['conversation-members', id, conversation.id] });
  };
  const action = useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) =>
      api(`${base}${path}`, { method, body }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });

  const { data: memberIds = [] } = useQuery({
    queryKey: ['conversation-members', id, conversation.id],
    queryFn: () => api<{ items: string[] }>(`${base}/members`).then((r) => r.items),
    enabled: membersOpen,
  });
  const { data: pins = [] } = useQuery({
    queryKey: ['pins', id, conversation.id],
    queryFn: () => api<{ items: MessageDto[] }>(`${base}/pins`).then((r) => r.items),
  });

  const startCall = useMutation({
    mutationFn: () =>
      api<MeetingDto>(`/workspaces/${id}/meetings`, {
        method: 'POST',
        body: { conversationId: conversation.id, title: `${isChannel ? '#' : ''}${title(conversation)} call` },
      }),
    onSuccess: (m) => router.push(`/${slug}/buzz/${m.code}`),
    onError: (e) => toast.error(e.message),
  });

  const candidates = members.filter(
    (m) => !memberIds.includes(m.userId) && (m.name.toLowerCase().includes(filter.toLowerCase()) || m.username.includes(filter.toLowerCase())),
  );

  return (
    <header className="flex items-center gap-3 border-b px-5 py-3">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-lg font-bold hover:bg-muted">
          {conversation.type === 'private_channel' ? <Lock className="size-4" /> : isChannel ? <Hash className="size-5" /> : null}
          <span className="truncate">{title(conversation)}</span>
          {conversation.membership?.muted && <BellOff className="size-4 text-muted-foreground" />}
          <ChevronDown className="size-4" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" className="z-50 min-w-56 rounded-lg border bg-popover p-1 shadow-lg">
            {conversation.membership && (
              <DropdownMenu.Item className={menuItem} onSelect={() => action.mutate({ path: '/preferences', method: 'PATCH', body: { muted: !conversation.membership?.muted } })}>
                {conversation.membership.muted ? 'Unmute conversation' : 'Mute conversation'}
              </DropdownMenu.Item>
            )}
            {canManage && (
              <DropdownMenu.Item
                className={menuItem}
                onSelect={() => {
                  const topic = prompt('Channel topic', conversation.topic ?? '');
                  if (topic !== null) action.mutate({ path: '', method: 'PATCH', body: { topic: topic || null } });
                }}
              >
                Edit topic
              </DropdownMenu.Item>
            )}
            {canManage && !conversation.isDefault && (
              <DropdownMenu.Item className={menuItem} onSelect={() => action.mutate({ path: conversation.archivedAt ? '/unarchive' : '/archive' })}>
                {conversation.archivedAt ? 'Unarchive channel' : 'Archive channel'}
              </DropdownMenu.Item>
            )}
            {isChannel && conversation.membership && !conversation.isDefault && (
              <DropdownMenu.Item
                className={`${menuItem} text-destructive`}
                onSelect={() => action.mutate({ path: '/leave' }, { onSuccess: () => router.push(`/${slug}/home`) })}
              >
                Leave channel
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {conversation.topic && <p className="hidden truncate text-sm text-muted-foreground md:block">{conversation.topic}</p>}

      <div className="ml-auto flex items-center gap-1">
        <Popover.Root>
          <Popover.Trigger className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted" aria-label="Pinned messages">
            <Pin className="size-4" /> {pins.length > 0 && pins.length}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={6} className="z-50 max-h-96 w-96 overflow-y-auto rounded-lg border bg-popover p-2 shadow-xl">
              <h3 className="px-2 py-1 text-sm font-semibold">Pinned messages</h3>
              {pins.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Nothing pinned yet.</p>}
              {pins.map((m) => (
                <button
                  key={m.id}
                  className="block w-full rounded-md p-2 text-left hover:bg-muted"
                  onClick={() => router.push(`/${slug}/home/c/${conversation.id}?message=${m.id}`)}
                >
                  <span className="text-xs font-semibold">{byUserId.get(m.authorId)?.name}</span>
                  <span className="line-clamp-2 text-sm">{m.text}</span>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <button onClick={() => setMembersOpen(true)} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted" aria-label="Members">
          <Users className="size-4" /> {conversation.memberCount}
        </button>
        {canMeet && conversation.membership && (
          <Button size="sm" variant="outline" onClick={() => startCall.mutate()} disabled={startCall.isPending}>
            <PhoneCall /> Call
          </Button>
        )}
      </div>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent title={`Members of ${title(conversation)}`}>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {memberIds.map((u) => {
              const m = byUserId.get(u);
              return (
                <div key={u} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <Avatar name={m?.name ?? '?'} src={m?.image} />
                  <span className="flex-1 text-sm">{m?.name ?? 'Unknown'}</span>
                  {canManage && u !== session?.user.id && !conversation.isDefault && (
                    <button className="text-xs text-destructive hover:underline" onClick={() => action.mutate({ path: `/members/${u}`, method: 'DELETE' })}>
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {isChannel && conversation.membership && !conversation.archivedAt && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <UserPlus className="size-4" /> Add people
              </p>
              <Input placeholder="Search people" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {candidates.slice(0, 20).map((m) => (
                  <button
                    key={m.userId}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => action.mutate({ path: '/members', body: { userIds: [m.userId] } })}
                  >
                    <Avatar name={m.name} src={m.image} className="size-6" /> {m.name}
                    <span className="text-muted-foreground">@{m.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
