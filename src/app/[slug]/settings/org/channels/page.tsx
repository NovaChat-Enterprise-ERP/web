'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Hash, Lock } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import type { ConversationDto } from '@novachat-enterprise-erp/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useMembers } from '@/hooks/use-members';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export default function ChannelManagementPage() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  const { byUserId } = useMembers();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const key = ['admin-channels', id, query];
  const { data: channels = [] } = useQuery({
    queryKey: key,
    queryFn: () => api<{ items: ConversationDto[] }>(`/workspaces/${id}/conversations/browse?scope=all&q=${encodeURIComponent(query)}`).then((r) => r.items),
  });
  const act = useMutation({
    mutationFn: ({ cid, path, method = 'POST', body }: { cid: string; path: string; method?: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) =>
      api(`/workspaces/${id}/conversations/${cid}${path}`, { method, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-channels', id] });
      qc.invalidateQueries({ queryKey: qk.conversations(id) });
      toast.success('Done');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section>
      <h2 className="text-xl font-semibold">Channel Management</h2>
      <p className="mt-1 text-muted-foreground">Every public and private channel in this workspace.</p>
      <Input className="mt-6 max-w-xs" placeholder="Search channels" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {channels.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-medium">
                    {c.type === 'private_channel' ? <Lock className="size-4" /> : <Hash className="size-4" />} {c.name}
                    {c.isDefault && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">default</span>}
                    {c.archivedAt && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-700">archived</span>}
                  </span>
                </td>
                <td className="px-4 py-3">{c.memberCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(c.createdAt), 'MMM d, yyyy')} by {byUserId.get(c.createdBy)?.name ?? 'someone'}
                </td>
                <td className="px-4 py-3">
                  {!c.isDefault && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => act.mutate({ cid: c.id, path: '', method: 'PATCH', body: { isPrivate: c.type === 'public_channel' } })}>
                        Make {c.type === 'public_channel' ? 'private' : 'public'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act.mutate({ cid: c.id, path: c.archivedAt ? '/unarchive' : '/archive' })}>
                        {c.archivedAt ? 'Unarchive' : 'Archive'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => confirm(`Delete #${c.name} and all its messages?`) && act.mutate({ cid: c.id, path: '', method: 'DELETE' })}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
