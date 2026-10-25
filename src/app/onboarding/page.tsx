'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { WorkspaceDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const create = useMutation({
    mutationFn: () => api<WorkspaceDto>('/workspaces', { method: 'POST', body: { name, slug } }),
    onSuccess: (workspace) => router.replace(`/${workspace.slug}/home`),
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-topbar px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-card p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Create a workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">A home for your class, cohort or team.</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Workspace name</span>
          <Input
            value={name}
            required
            minLength={2}
            maxLength={60}
            placeholder="Itoje Dollar"
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">URL</span>
          <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="pl-3 text-sm text-muted-foreground">novachat/</span>
            <Input
              value={slug}
              required
              className="border-0 pl-1 focus-visible:ring-0"
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </div>
        </label>
        <Button type="submit" className="w-full" disabled={create.isPending || slug.length < 3}>
          {create.isPending ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </main>
  );
}
