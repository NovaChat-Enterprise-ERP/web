'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, UserPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PERMISSIONS, type InviteDto, type RoleDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field, selectClass } from '@/components/ui/field';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';

export function InviteDialog({ trigger }: { trigger?: ReactNode }) {
  const workspace = useWorkspace();
  const canManage = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState('');
  const [roleId, setRoleId] = useState('');
  const [link, setLink] = useState<string | null>(null);

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', workspace.id],
    queryFn: () => api<{ items: RoleDto[] }>(`/workspaces/${workspace.id}/roles`).then((r) => r.items),
    enabled: open,
  });
  const assignable = roles.filter((r) => r.key !== 'owner' && (canManage || r.key === 'member' || r.key === 'guest'));

  const sendEmails = useMutation({
    mutationFn: () =>
      api<{ items: InviteDto[] }>(`/workspaces/${workspace.id}/invites`, {
        method: 'POST',
        body: {
          emails: emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean),
          roleId: roleId || undefined,
        },
      }),
    onSuccess: ({ items }) => {
      toast.success(`Sent ${items.length} invite${items.length === 1 ? '' : 's'}`);
      setEmails('');
      queryClient.invalidateQueries({ queryKey: ['invites', workspace.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const createLink = useMutation({
    mutationFn: () =>
      api<InviteDto>(`/workspaces/${workspace.id}/invites/link`, {
        method: 'POST',
        body: { roleId: roleId || undefined, expiresInDays: 7 },
      }),
    onSuccess: (invite) => {
      setLink(invite.url ?? null);
      queryClient.invalidateQueries({ queryKey: ['invites', workspace.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), o || setLink(null))}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UserPlus /> Invite people
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={`Invite people to ${workspace.name}`} description="Invite by email or share a link.">
        <div className="space-y-4">
          <Field label="Email addresses" hint="Separate multiple emails with commas or spaces.">
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder="ada@example.com, grace@example.com"
              className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field label="Invite as">
            <select className={selectClass} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Member</option>
              {assignable
                .filter((r) => r.key !== 'member')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => createLink.mutate()} disabled={createLink.isPending}>
              <Link2 /> Create invite link
            </Button>
            <Button onClick={() => sendEmails.mutate()} disabled={!emails.trim() || sendEmails.isPending}>
              Send invites
            </Button>
          </div>
          {link && (
            <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
              <code className="flex-1 truncate text-xs">{link}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}
              >
                <Copy /> Copy
              </Button>
            </div>
          )}
          {link && <p className="text-xs text-muted-foreground">This link expires in 7 days. It is shown only once.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
