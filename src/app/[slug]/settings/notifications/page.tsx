'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NotificationPreferencesDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const LEVELS = [
  { value: 'all', label: 'All activity', hint: 'Direct messages, mentions, @channel and replies to your threads' },
  { value: 'mentions', label: 'Direct messages and mentions', hint: 'Skip thread replies' },
  { value: 'none', label: 'Nothing', hint: 'You will not get notifications in this workspace' },
] as const;

export default function NotificationSettingsPage() {
  const { id, name } = useWorkspace();
  const qc = useQueryClient();
  const key = ['notification-preferences', id];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<NotificationPreferencesDto>(`/workspaces/${id}/notifications/preferences`) });
  const save = useMutation({
    mutationFn: (body: Partial<NotificationPreferencesDto>) =>
      api<NotificationPreferencesDto>(`/workspaces/${id}/notifications/preferences`, { method: 'PUT', body }),
    onSuccess: (prefs) => {
      qc.setQueryData(key, prefs);
      toast.success('Preferences saved');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="max-w-2xl">
      <h2 className="text-xl font-semibold">Notifications</h2>
      <p className="mt-1 text-muted-foreground">Choose what {name} notifies you about. Pause everything from your profile menu.</p>
      <div className="mt-6 space-y-3">
        {LEVELS.map((l) => (
          <label key={l.value} className={cn('flex cursor-pointer gap-3 rounded-xl border p-4', data?.level === l.value && 'border-primary bg-primary/5')}>
            <input type="radio" name="level" className="mt-1 accent-primary" checked={data?.level === l.value} onChange={() => save.mutate({ level: l.value })} />
            <span>
              <span className="block font-medium">{l.label}</span>
              <span className="text-sm text-muted-foreground">{l.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="mt-8 flex items-center gap-3">
        <input type="checkbox" className="size-4 accent-primary" checked={data?.emailEnabled ?? true} onChange={(e) => save.mutate({ emailEnabled: e.target.checked })} />
        Email me meeting invitations
      </label>
    </section>
  );
}
