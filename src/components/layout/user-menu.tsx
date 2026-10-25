'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, Smile } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { toast } from 'sonner';
import type { UpdateMyMembershipInput } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { signOut, useSession } from '@/lib/auth-client';
import { useMyMembership } from '@/hooks/use-membership';
import { useWorkspace } from './workspace-context';

const itemClass = 'block cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-muted';

export function UserMenu() {
  const workspace = useWorkspace();
  const { data: session } = useSession();
  const { data: me } = useMyMembership(workspace.id);
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: (input: UpdateMyMembershipInput) =>
      api(`/workspaces/${workspace.id}/me`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['membership', workspace.id] }),
    onError: (e) => toast.error(e.message),
  });

  const name = session?.user.name ?? 'You';
  const away = me?.isAway ?? false;
  const paused = me?.notificationsPausedUntil ? new Date(me.notificationsPausedUntil) > new Date() : false;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white">
        <Avatar name={name} src={session?.user.image} className="size-10" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="right" align="end" sideOffset={12} className="z-50 w-80 rounded-lg border bg-popover p-2 shadow-xl">
          <div className="flex items-center gap-3 p-2">
            <Avatar name={name} src={session?.user.image} className="size-11" />
            <div>
              <div className="font-semibold">{name}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-2 rounded-full ${away ? 'border border-muted-foreground' : 'bg-green-500'}`} />
                {away ? 'Away' : 'Active'}
              </div>
            </div>
          </div>
          <DropdownMenu.Item asChild>
            <Link href={`/${workspace.slug}/settings/account?status=1`} className="mx-2 my-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground outline-none data-highlighted:bg-muted">
              <Smile className="size-4" />
              {me?.status.text ? `${me.status.emoji ?? ''} ${me.status.text}` : 'Update your status'}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={() => update.mutate({ isAway: !away })}>
            {away ? 'Set yourself as active' : 'Set yourself as away'}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemClass}
            onSelect={() =>
              update.mutate({
                notificationsPausedUntil: paused ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              })
            }
          >
            {paused ? 'Resume notifications' : 'Pause notifications (1 hour)'}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link href={`/${workspace.slug}/settings/account`} className={itemClass}>Profile...</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href={`/${workspace.slug}/settings/appearance`} className={itemClass}>Preferences...</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={`${itemClass} flex items-center gap-2`} disabled>
            <Rocket className="size-4" /> Buy AI Credits
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemClass}
            onSelect={async () => {
              await signOut();
              window.location.href = '/login';
            }}
          >
            Sign out of {workspace.name}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
