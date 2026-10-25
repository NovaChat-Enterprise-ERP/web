'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ALL_PERMISSIONS, PERMISSIONS, type RoleDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const LABELS: Record<string, string> = {
  'workspace:manage': 'Edit workspace settings',
  'workspace:delete': 'Delete the workspace',
  'members:invite': 'Invite people',
  'members:manage': 'Manage members (roles, deactivate, remove)',
  'roles:manage': 'Manage roles & permissions',
  'audit:view': 'View the audit log',
  'channels:create': 'Create channels',
  'channels:manage': 'Manage all channels',
  'messages:delete_any': "Delete anyone's messages",
  'files:delete_any': "Delete anyone's files",
  'meetings:create': 'Start meetings',
  'meetings:manage_any': 'Manage any meeting',
};

const GRANTABLE = ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.WORKSPACE_DELETE);

export default function RolesPage() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const base = `/workspaces/${workspace.id}/roles`;

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', workspace.id],
    queryFn: () => api<{ items: RoleDto[] }>(base).then((r) => r.items),
  });
  const selected = roles.find((r) => r.id === selectedId) ?? roles[1] ?? roles[0];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles', workspace.id] });
  const update = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      api<RoleDto>(`${base}/${id}`, { method: 'PATCH', body: { permissions } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: (name: string) => api<RoleDto>(base, { method: 'POST', body: { name, permissions: [] } }),
    onSuccess: (role) => {
      setCreating(false);
      setSelectedId(role.id);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`${base}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setSelectedId(null);
      invalidate();
      toast.success('Role deleted; its members are now Members');
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = (permission: string) => {
    if (!selected) return;
    const permissions = selected.permissions.includes(permission)
      ? selected.permissions.filter((p) => p !== permission)
      : [...selected.permissions, permission];
    update.mutate({ id: selected.id, permissions });
  };

  return (
    <section>
      <h2 className="text-xl font-semibold">Roles & Permissions</h2>
      <p className="mt-1 text-muted-foreground">Decide what each role can do. Changes apply within a minute.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="space-y-1">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                selected?.id === r.id && 'bg-primary/10 font-semibold text-primary',
              )}
            >
              <span>{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.memberCount}</span>
            </button>
          ))}
          <Button variant="ghost" className="w-full justify-start" onClick={() => setCreating(true)}>
            <Plus /> New role
          </Button>
        </div>
        {selected && (
          <div className="rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selected.key === 'owner' ? 'The owner can do everything.' : selected.isSystem ? 'Built-in role' : 'Custom role'}
                </p>
              </div>
              {!selected.isSystem && (
                <Button variant="destructive" size="sm" onClick={() => confirm(`Delete ${selected.name}?`) && remove.mutate(selected.id)}>
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
            <div className="mt-6 space-y-3">
              {GRANTABLE.map((p) => (
                <label key={p} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.permissions.includes(p)}
                    disabled={selected.key === 'owner' || update.isPending}
                    onChange={() => toggle(p)}
                  />
                  {LABELS[p] ?? p}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title="New role">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(String(new FormData(e.currentTarget).get('name')));
            }}
          >
            <Field label="Role name">
              <Input name="name" required minLength={2} maxLength={40} placeholder="Teaching Assistant" />
            </Field>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              Create role
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
