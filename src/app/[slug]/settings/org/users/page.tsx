'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import type { InviteDto, MemberDto, Page, RoleDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { selectClass } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { InviteDialog } from '@/components/workspace/invite-dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Status = 'active' | 'deactivated';

export default function UserManagementPage() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('active');
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const base = `/workspaces/${workspace.id}`;

  const { data: members } = useQuery({
    queryKey: ['members', workspace.id, 'admin', status, query],
    queryFn: () => api<Page<MemberDto>>(`${base}/members?limit=100&status=${status}&q=${encodeURIComponent(query)}`),
  });
  const { data: roles = [] } = useQuery({
    queryKey: ['roles', workspace.id],
    queryFn: () => api<{ items: RoleDto[] }>(`${base}/roles`).then((r) => r.items),
  });
  const { data: invites = [] } = useQuery({
    queryKey: ['invites', workspace.id],
    queryFn: () => api<{ items: InviteDto[] }>(`${base}/invites`).then((r) => r.items),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['members', workspace.id] });
    queryClient.invalidateQueries({ queryKey: ['invites', workspace.id] });
    queryClient.invalidateQueries({ queryKey: ['roles', workspace.id] });
  };
  const action = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) =>
      api(`${base}${path}`, { method, body }),
    onSuccess: () => {
      toast.success('Done');
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="mt-1 text-muted-foreground">Change roles, deactivate or remove people.</p>
        </div>
        <InviteDialog />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex rounded-md border p-1">
          {(['active', 'deactivated'] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn('rounded px-3 py-1 text-sm capitalize', status === s && 'bg-primary text-primary-foreground')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {members?.items.map((m) => {
              const locked = m.role.key === 'owner' || m.id === workspace.memberId;
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} src={m.image} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={cn(selectClass, 'h-8 w-40')}
                      value={m.role.id}
                      disabled={locked}
                      onChange={(e) => action.mutate({ path: `/members/${m.id}/role`, method: 'PATCH', body: { roleId: e.target.value } })}
                    >
                      {roles
                        .filter((r) => r.key !== 'owner' || r.id === m.role.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}</td>
                  <td className="px-2">
                    {!locked && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger className="rounded p-1.5 hover:bg-muted" aria-label="Member actions">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content align="end" className="z-50 min-w-48 rounded-lg border bg-popover p-1 shadow-lg">
                            {m.deactivatedAt ? (
                              <DropdownMenu.Item
                                className="cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-muted"
                                onSelect={() => action.mutate({ path: `/members/${m.id}/reactivate`, method: 'POST' })}
                              >
                                Reactivate
                              </DropdownMenu.Item>
                            ) : (
                              <DropdownMenu.Item
                                className="cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-muted"
                                onSelect={() => action.mutate({ path: `/members/${m.id}/deactivate`, method: 'POST' })}
                              >
                                Deactivate
                              </DropdownMenu.Item>
                            )}
                            {workspace.role === 'owner' && !m.deactivatedAt && (
                              <DropdownMenu.Item
                                className="cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-muted"
                                onSelect={() =>
                                  confirm(`Make ${m.name} the owner? You will become an admin.`) &&
                                  action.mutate({ path: '/transfer-ownership', method: 'POST', body: { memberId: m.id } })
                                }
                              >
                                Transfer ownership
                              </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item
                              className="cursor-pointer rounded px-3 py-2 text-sm text-destructive outline-none data-highlighted:bg-muted"
                              onSelect={() => confirm(`Remove ${m.name}?`) && action.mutate({ path: `/members/${m.id}`, method: 'DELETE' })}
                            >
                              Remove from workspace
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members?.items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nobody here.</p>}
      </div>

      <h3 className="mt-10 font-semibold">Pending invites</h3>
      <div className="mt-3 divide-y rounded-xl border">
        {invites.map((i) => (
          <div key={i.id} className="flex items-center gap-4 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{i.email ?? `Invite link · ${i.uses}${i.maxUses ? `/${i.maxUses}` : ''} uses`}</span>
            <span className="text-muted-foreground">{i.roleName}</span>
            <span className="text-muted-foreground">expires {formatDistanceToNow(new Date(i.expiresAt), { addSuffix: true })}</span>
            <Button size="sm" variant="ghost" onClick={() => action.mutate({ path: `/invites/${i.id}`, method: 'DELETE' })}>
              Revoke
            </Button>
          </div>
        ))}
        {invites.length === 0 && <p className="p-4 text-sm text-muted-foreground">No pending invites.</p>}
      </div>
    </section>
  );
}
