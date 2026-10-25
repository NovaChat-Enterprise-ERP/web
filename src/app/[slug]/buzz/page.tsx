'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarPlus, Keyboard, Link2, PhoneCall, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { toast } from 'sonner';
import { PERMISSIONS, type MeetingDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useCan } from '@/hooks/use-can';
import { useMembers } from '@/hooks/use-members';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

const CODE = /([a-z]{3}-[a-z]{4}-[a-z]{3})/i;
const menuItem = 'flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm outline-none data-highlighted:bg-muted';

function Illustration() {
  return (
    <svg viewBox="0 0 640 260" className="mx-auto mt-10 w-full max-w-2xl" aria-hidden>
      <rect x="150" y="40" width="340" height="200" rx="18" className="fill-primary/15" />
      <rect x="170" y="60" width="145" height="160" rx="12" className="fill-primary/30" />
      <rect x="325" y="60" width="145" height="75" rx="12" className="fill-primary/25" />
      <rect x="325" y="145" width="145" height="75" rx="12" className="fill-primary/20" />
      <circle cx="242" cy="125" r="28" className="fill-primary/60" />
      <circle cx="397" cy="92" r="16" className="fill-primary/50" />
      <circle cx="397" cy="177" r="16" className="fill-primary/40" />
      <circle cx="90" cy="70" r="14" className="fill-primary/40" />
      <circle cx="560" cy="200" r="18" className="fill-primary/30" />
      <text x="70" y="190" className="fill-primary/60 font-bold" fontSize="34">X²</text>
      <text x="520" y="80" className="fill-primary/50 font-bold" fontSize="26">{'<X,Y>'}</text>
    </svg>
  );
}

export default function BuzzPage() {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const canCreate = useCan(PERMISSIONS.MEETINGS_CREATE);
  const { byUserId } = useMembers();
  const [code, setCode] = useState('');

  const { data: meetings = [] } = useQuery({
    queryKey: qk.meetings(id),
    queryFn: () => api<{ items: MeetingDto[] }>(`/workspaces/${id}/meetings?status=active`).then((r) => r.items),
    refetchInterval: 30_000,
  });

  const create = useMutation({
    mutationFn: (later: boolean) =>
      api<MeetingDto>(`/workspaces/${id}/meetings`, { method: 'POST', body: {} }).then((m) => ({ m, later })),
    onSuccess: ({ m, later }) => {
      if (!later) return router.push(`/${slug}/buzz/${m.code}`);
      const url = `${window.location.origin}/${slug}/buzz/${m.code}`;
      navigator.clipboard.writeText(url).then(() => toast.success('Meeting link copied', { description: url }));
    },
    onError: (e) => toast.error(e.message),
  });

  const parsed = CODE.exec(code)?.[1]?.toLowerCase();

  return (
    <main className="flex-1 overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Seamless video calls and meetings for every learning community.</h1>
        <p className="mt-4 text-xl text-muted-foreground">Connect classrooms, cohorts, and teams in one shared space</p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          {canCreate && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button size="lg" className="h-14 px-8 text-base" disabled={create.isPending}>
                  <CalendarPlus /> New meeting
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-64 rounded-lg border bg-popover p-1 shadow-xl">
                  <DropdownMenu.Item className={menuItem} onSelect={() => create.mutate(false)}>
                    <Video className="size-4" /> Start an instant meeting
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={menuItem} onSelect={() => create.mutate(true)}>
                    <Link2 className="size-4" /> Create a meeting for later
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          <form
            className="flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (parsed) router.push(`/${slug}/buzz/${parsed}`);
            }}
          >
            <div className="relative">
              <Keyboard className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter a code or link"
                className="h-14 w-80 rounded-lg border bg-background pl-12 pr-4 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button type="submit" disabled={!parsed} className="text-base font-medium text-primary disabled:text-muted-foreground">
              Join
            </button>
          </form>
        </div>

        {meetings.length > 0 ? (
          <div className="mx-auto mt-12 max-w-2xl space-y-3 text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your meetings</h2>
            {meetings.map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-xl border p-4">
                <span className={`grid size-10 place-items-center rounded-lg ${m.status === 'live' ? 'bg-green-500/15 text-green-600' : 'bg-primary/10 text-primary'}`}>
                  <PhoneCall className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.title ?? 'Meeting'}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {m.code} · {m.status === 'live' ? 'Live now' : 'Not started'} · hosted by {byUserId.get(m.hostId)?.name ?? 'someone'}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {m.activeParticipantIds.slice(0, 4).map((u) => (
                    <Avatar key={u} name={byUserId.get(u)?.name ?? '?'} src={byUserId.get(u)?.image} className="size-7 ring-2 ring-background" />
                  ))}
                </div>
                <Button size="sm" onClick={() => router.push(`/${slug}/buzz/${m.code}`)}>
                  Join
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Illustration />
        )}
      </div>
    </main>
  );
}
