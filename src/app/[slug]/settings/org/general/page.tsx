'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { PERMISSIONS, type WorkspaceDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';

export default function GeneralSettingsPage() {
  const workspace = useWorkspace();
  const canManage = useCan(PERMISSIONS.WORKSPACE_MANAGE);
  const isOwner = workspace.role === 'owner';
  const router = useRouter();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (body: Partial<WorkspaceDto>) => api<WorkspaceDto>(`/workspaces/${workspace.id}`, { method: 'PATCH', body }),
    onSuccess: (updated) => {
      toast.success('Workspace updated');
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      if (updated.slug !== workspace.slug) router.replace(`/${updated.slug}/settings/org/general`);
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/workspaces/${workspace.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      router.replace('/');
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    save.mutate({
      name: String(form.get('name')),
      slug: String(form.get('slug')),
      description: String(form.get('description') || '') || null,
      allowMemberInvites: form.get('allowMemberInvites') === 'on',
    });
  };

  return (
    <section className="max-w-2xl">
      <h2 className="text-xl font-semibold">General</h2>
      <p className="mt-1 text-muted-foreground">Your organisation&apos;s name, address and defaults.</p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <fieldset disabled={!canManage} className="space-y-5">
          <Field label="Workspace name">
            <Input name="name" defaultValue={workspace.name} required minLength={2} maxLength={60} />
          </Field>
          <Field label="Workspace URL" hint="Changing this breaks old links.">
            <Input name="slug" defaultValue={workspace.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              defaultValue={workspace.description ?? ''}
              rows={3}
              maxLength={280}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="allowMemberInvites" defaultChecked={workspace.allowMemberInvites} className="size-4 accent-primary" />
            Let members invite people (admins can always invite)
          </label>
          {canManage && (
            <Button type="submit" disabled={save.isPending}>
              Save changes
            </Button>
          )}
        </fieldset>
      </form>

      {isOwner && (
        <div className="mt-12 rounded-xl border border-destructive/40 p-6">
          <h3 className="font-semibold text-destructive">Delete workspace</h3>
          <p className="mt-1 text-sm text-muted-foreground">Everyone loses access immediately. This cannot be undone.</p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => prompt(`Type ${workspace.slug} to confirm`) === workspace.slug && remove.mutate()}
          >
            Delete {workspace.name}
          </Button>
        </div>
      )}
    </section>
  );
}
