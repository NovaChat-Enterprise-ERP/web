'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { UpdateMyMembershipInput, UserDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, selectClass } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useMyMembership } from '@/hooks/use-membership';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';

const STATUS_PRESETS = [
  { emoji: '📅', text: 'In a meeting', hours: 1 },
  { emoji: '🚌', text: 'Commuting', hours: 0.5 },
  { emoji: '🤒', text: 'Out sick', hours: 24 },
  { emoji: '🌴', text: 'On vacation', hours: 0 },
  { emoji: '📚', text: 'Studying', hours: 2 },
];

function AccountSettings() {
  const workspace = useWorkspace();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, refetch } = useSession();
  const { data: me } = useMyMembership(workspace.id);
  const [editing, setEditing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const params = useSearchParams();

  useEffect(() => {
    if (params.get('status')) setStatusOpen(true);
  }, [params]);

  const saveProfile = useMutation({
    mutationFn: (body: { name: string; username: string }) => api<UserDto>('/me', { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('Profile updated');
      setEditing(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['membership', workspace.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const saveMembership = useMutation({
    mutationFn: (body: UpdateMyMembershipInput) => api(`/workspaces/${workspace.id}/me`, { method: 'PATCH', body }),
    onSuccess: () => {
      setStatusOpen(false);
      queryClient.invalidateQueries({ queryKey: ['membership', workspace.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const leave = useMutation({
    mutationFn: () => api(`/workspaces/${workspace.id}/leave`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      router.replace('/');
    },
    onError: (e) => toast.error(e.message),
  });

  const submitProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveProfile.mutate({ name: String(form.get('name')), username: String(form.get('username')) });
  };

  const submitStatus = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const hours = Number(form.get('expires'));
    saveMembership.mutate({
      status: {
        emoji: String(form.get('emoji') || '') || null,
        text: String(form.get('text') || '') || null,
        expiresAt: hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null,
      },
    });
  };

  const user = session?.user;

  return (
    <section>
      <h2 className="text-xl font-semibold">Your Account Information</h2>
      <p className="mt-1 text-muted-foreground">Manage your account data with ease.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative rounded-xl border p-6">
          <Button size="icon" variant="outline" className="absolute right-5 top-5 text-foreground" onClick={() => setEditing(true)} aria-label="Edit profile">
            <Pencil />
          </Button>
          <Avatar name={user?.name ?? ''} src={user?.image} className="size-44 rounded-xl text-4xl" />
          <p className="mt-6 text-sm text-muted-foreground">Name</p>
          <p className="mt-1 text-lg">
            {user?.name} <span className="text-muted-foreground">• @{me?.username}</span>
          </p>
          <p className="mt-6 text-sm text-muted-foreground">Status</p>
          <p className="mt-1 text-lg text-muted-foreground">
            {me?.status.text ? `${me.status.emoji ?? ''} ${me.status.text}` : 'No status set'}
          </p>
          <div className="mt-2 flex gap-4">
            <button className="text-primary hover:underline" onClick={() => setStatusOpen(true)}>
              {me?.status.text ? 'Change status' : 'Set a status'}
            </button>
            {me?.status.text && (
              <button className="text-muted-foreground hover:underline" onClick={() => saveMembership.mutate({ status: { emoji: null, text: null, expiresAt: null } })}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="h-fit rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Email Address</p>
          <p className="mt-2 text-lg">{user?.email}</p>
        </div>
      </div>

      {workspace.role !== 'owner' && (
        <Button
          variant="destructive"
          className="mt-8"
          onClick={() => confirm(`Leave ${workspace.name}?`) && leave.mutate()}
          disabled={leave.isPending}
        >
          Leave Organisation
        </Button>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title="Edit profile">
          <form onSubmit={submitProfile} className="space-y-4">
            <Field label="Full name">
              <Input name="name" defaultValue={user?.name} required maxLength={80} />
            </Field>
            <Field label="Username" hint="Lowercase letters, numbers, dots and underscores.">
              <Input name="username" defaultValue={me?.username} required pattern="[a-z0-9_.]{3,32}" />
            </Field>
            <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent title="Set a status">
          <form onSubmit={submitStatus} className="space-y-4" key={String(statusOpen)}>
            <div className="flex gap-2">
              <Input name="emoji" defaultValue={me?.status.emoji ?? '💬'} className="w-16 text-center" maxLength={4} />
              <Input name="text" defaultValue={me?.status.text ?? ''} placeholder="What's your status?" maxLength={100} />
            </div>
            <div className="space-y-1">
              {STATUS_PRESETS.map((p) => (
                <button
                  key={p.text}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() =>
                    saveMembership.mutate({
                      status: {
                        emoji: p.emoji,
                        text: p.text,
                        expiresAt: p.hours ? new Date(Date.now() + p.hours * 3_600_000).toISOString() : null,
                      },
                    })
                  }
                >
                  <span>{p.emoji}</span> {p.text}
                </button>
              ))}
            </div>
            <Field label="Clear after">
              <select name="expires" className={selectClass} defaultValue="0">
                <option value="0">Don&apos;t clear</option>
                <option value="0.5">30 minutes</option>
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="24">Today</option>
                <option value="168">This week</option>
              </select>
            </Field>
            <Button type="submit" className="w-full" disabled={saveMembership.isPending}>
              Save status
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountSettings />
    </Suspense>
  );
}
