'use client';

import '@livekit/components-styles';
import { LiveKitRoom, PreJoin, VideoConference, type LocalUserChoices } from '@livekit/components-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MicOff, PhoneOff, UserMinus, UserPlus, Users, VideoOff } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { LiveParticipantDto, MeetingDto, MeetingJoinDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/query-keys';

function HostPanel({ meeting, isHost }: { meeting: MeetingDto; isHost: boolean }) {
  const { id, slug } = useWorkspace();
  const { members, byUserId } = useMembers();
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const base = `/workspaces/${id}/meetings/${meeting.code}`;

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', meeting.code],
    queryFn: () => api<{ items: LiveParticipantDto[] }>(`${base}/participants`).then((r) => r.items),
    refetchInterval: 5_000,
  });
  const act = useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: 'POST' | 'DELETE'; body?: unknown }) => api(`${base}${path}`, { method, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participants', meeting.code] }),
    onError: (e) => toast.error(e.message),
  });

  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/${slug}/buzz/${meeting.code}`;
  const invitable = members.filter(
    (m) => m.userId !== session?.user.id && !participants.some((p) => p.identity === m.userId) && m.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#111] p-4 text-white">
      <div>
        <p className="text-xs uppercase tracking-wide text-white/50">Meeting</p>
        <p className="font-semibold">{meeting.title ?? 'Meeting'}</p>
        <button
          className="mt-2 flex w-full items-center justify-between rounded-md bg-white/10 px-3 py-2 font-mono text-sm hover:bg-white/15"
          onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}
        >
          {meeting.code} <Copy className="size-4" />
        </button>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" /> In the call ({participants.length})
        </p>
        <div className="space-y-1">
          {participants.map((p) => (
            <div key={p.identity} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
              <Avatar name={p.name} src={byUserId.get(p.identity)?.image} className="size-7" />
              <span className="flex-1 truncate text-sm">{p.name}</span>
              {p.microphoneMuted !== false && <MicOff className="size-3.5 text-white/40" />}
              {isHost && p.identity !== session?.user.id && (
                <>
                  <button title="Mute microphone" className="rounded p-1 hover:bg-white/10" onClick={() => act.mutate({ path: `/participants/${p.identity}/mute`, body: { source: 'microphone' } })}>
                    <MicOff className="size-4" />
                  </button>
                  <button title="Turn off camera" className="rounded p-1 hover:bg-white/10" onClick={() => act.mutate({ path: `/participants/${p.identity}/mute`, body: { source: 'camera' } })}>
                    <VideoOff className="size-4" />
                  </button>
                  <button title="Remove from call" className="rounded p-1 text-red-400 hover:bg-white/10" onClick={() => act.mutate({ path: `/participants/${p.identity}`, method: 'DELETE' })}>
                    <UserMinus className="size-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4" /> Invite people
        </p>
        <Input placeholder="Search people" value={filter} onChange={(e) => setFilter(e.target.value)} className="border-white/20 bg-white/5 text-white" />
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {invitable.slice(0, 15).map((m) => (
            <button
              key={m.userId}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/10"
              onClick={() => act.mutate({ path: '/invites', body: { userIds: [m.userId] } }, { onSuccess: () => toast.success(`Invited ${m.name}`) })}
            >
              <Avatar name={m.name} src={m.image} className="size-6" /> {m.name}
              {meeting.invitedUserIds.includes(m.userId) && <span className="ml-auto text-xs text-white/40">invited</span>}
            </button>
          ))}
        </div>
      </div>

      {isHost && (
        <Button
          variant="destructive"
          className="mt-auto border-red-500 text-red-400 hover:bg-red-500/10"
          onClick={() => confirm('End the meeting for everyone?') && act.mutate({ path: '/end' }, { onSuccess: () => router.push(`/${slug}/buzz`) })}
        >
          <PhoneOff /> End for everyone
        </Button>
      )}
    </aside>
  );
}

export default function MeetingPage() {
  const { code } = useParams<{ code: string }>();
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [joined, setJoined] = useState<MeetingJoinDto | null>(null);

  const { data: meeting, error } = useQuery({
    queryKey: ['meeting', id, code],
    queryFn: () => api<MeetingDto>(`/workspaces/${id}/meetings/${code}`),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => api<MeetingJoinDto>(`/workspaces/${id}/meetings/${code}/join`, { method: 'POST' }),
    onSuccess: setJoined,
    onError: (e) => toast.error(e.message),
  });

  const leave = () => {
    qc.invalidateQueries({ queryKey: qk.meetings(id) });
    router.push(`/${slug}/buzz`);
  };

  if (error) {
    return (
      <main className="grid flex-1 place-items-center text-center">
        <div>
          <p className="text-xl font-semibold">{error instanceof ApiError && error.status === 404 ? 'Meeting not found' : error.message}</p>
          <Button className="mt-4" onClick={() => router.push(`/${slug}/buzz`)}>Back to Buzz</Button>
        </div>
      </main>
    );
  }

  if (meeting?.status === 'ended') {
    return (
      <main className="grid flex-1 place-items-center text-center">
        <div>
          <p className="text-xl font-semibold">This meeting has ended.</p>
          <Button className="mt-4" onClick={() => router.push(`/${slug}/buzz`)}>Start a new one</Button>
        </div>
      </main>
    );
  }

  if (joined && choices) {
    return (
      <div className="flex min-w-0 flex-1 bg-black" data-lk-theme="default">
        <LiveKitRoom
          serverUrl={joined.serverUrl}
          token={joined.token}
          connect
          video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
          audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
          onDisconnected={leave}
          onError={(e) => toast.error(e.message)}
          className="min-w-0 flex-1"
        >
          <VideoConference />
        </LiveKitRoom>
        <HostPanel meeting={joined.meeting} isHost={joined.isHost} />
      </div>
    );
  }

  return (
    <main className="grid flex-1 place-items-center overflow-y-auto bg-black p-6" data-lk-theme="default">
      <div className="w-full max-w-xl text-center text-white">
        <h1 className="mb-1 text-2xl font-bold">{meeting?.title ?? 'Ready to join?'}</h1>
        <p className="mb-6 font-mono text-sm text-white/60">{code}</p>
        <PreJoin
          defaults={{ username: session?.user.name ?? '', videoEnabled: true, audioEnabled: true }}
          joinLabel={join.isPending ? 'Joining…' : 'Join now'}
          onSubmit={(values) => {
            setChoices(values);
            join.mutate();
          }}
          onError={(e) => toast.error(e.message)}
        />
      </div>
    </main>
  );
}
