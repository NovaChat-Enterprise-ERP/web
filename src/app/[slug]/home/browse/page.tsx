'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Lock, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { PERMISSIONS, type ConversationDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateChannelDialog } from '@/components/chat/create-channel-dialog';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export default function BrowseChannelsPage() {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const canCreate = useCan(PERMISSIONS.CHANNELS_CREATE);
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['browse', id, query],
    queryFn: () => api<{ items: ConversationDto[] }>(`/workspaces/${id}/conversations/browse?q=${encodeURIComponent(query)}`).then((r) => r.items),
  });

  const join = useMutation({
    mutationFn: (cid: string) => api<ConversationDto>(`/workspaces/${id}/conversations/${cid}/join`, { method: 'POST' }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: qk.conversations(id) });
      router.push(`/${slug}/home/c/${c.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-bold">All channels</h1>
        {canCreate && (
          <CreateChannelDialog
            trigger={
              <Button size="sm">
                <Plus /> Create channel
              </Button>
            }
          />
        )}
      </header>
      <div className="px-6 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search channels" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 divide-y overflow-y-auto border-t">
        {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
        {channels.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40">
            <button className="min-w-0 flex-1 text-left" onClick={() => router.push(`/${slug}/home/c/${c.id}`)}>
              <p className="flex items-center gap-1.5 font-semibold">
                {c.type === 'private_channel' ? <Lock className="size-4" /> : <Hash className="size-4" />}
                {c.name}
                {c.archivedAt && <span className="text-xs font-normal text-muted-foreground">(archived)</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {c.membership && <span className="font-medium text-green-600">Joined · </span>}
                {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                {c.description && ` · ${c.description}`}
              </p>
            </button>
            {!c.membership && !c.archivedAt && (
              <Button size="sm" variant="outline" onClick={() => join.mutate(c.id)} disabled={join.isPending}>
                Join
              </Button>
            )}
          </div>
        ))}
        {!isLoading && channels.length === 0 && <p className="p-6 text-sm text-muted-foreground">No channels match.</p>}
      </div>
    </main>
  );
}
