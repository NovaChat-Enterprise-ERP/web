'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { ConversationDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export function CreateChannelDialog({ trigger }: { trigger: ReactNode }) {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setPrivate] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      api<ConversationDto>(`/workspaces/${id}/conversations/channels`, {
        method: 'POST',
        body: { name, description: description || null, isPrivate },
      }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: qk.conversations(id) });
      setOpen(false);
      setName('');
      setDescription('');
      router.push(`/${slug}/home/c/${c.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Create a channel" description="Channels are where conversations happen around a topic.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label="Name">
            <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-3 text-muted-foreground">#</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))}
                className="border-0 pl-1 focus-visible:ring-0"
                placeholder="e.g. course-101"
                maxLength={80}
                required
              />
            </div>
          </Field>
          <Field label="Description (optional)">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={250} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} className="size-4 accent-primary" />
            Make private — only invited people can see it
          </label>
          <Button type="submit" className="w-full" disabled={!name || create.isPending}>
            Create channel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
