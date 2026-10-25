'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useConversations, useOpenDirect } from '@/hooks/use-conversations';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';

export default function NewChatPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const { members, byUserId } = useMembers();
  const { data: conversations = [] } = useConversations();
  const { data: session } = useSession();
  const open = useOpenDirect();
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState('');

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/^@/, '');
    if (!term) return [];
    const channels = term.startsWith('#')
      ? conversations
          .filter((c) => c.name?.includes(term.slice(1)))
          .map((c) => ({ kind: 'channel' as const, id: c.id, label: `#${c.name}`, sub: `${c.memberCount} members` }))
      : [];
    const people = members
      .filter((m) => m.userId !== session?.user.id && !selected.includes(m.userId))
      .filter((m) => m.name.toLowerCase().includes(term) || m.username.includes(term))
      .slice(0, 8)
      .map((m) => ({ kind: 'person' as const, id: m.userId, label: m.name, sub: `@${m.username}` }));
    return [...channels, ...people];
  }, [q, members, conversations, selected, session?.user.id]);

  const start = () =>
    open.mutate(selected, {
      onSuccess: (c) => router.push(`/${slug}/home/c/${c.id}`),
      onError: (e) => toast.error(e.message),
    });

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="border-b px-6 py-5">
        <h1 className="text-2xl font-semibold">{selected.length > 1 ? 'New Group Chat' : 'New Message'}</h1>
      </header>
      <div className="relative border-b px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2" onClick={() => input.current?.focus()}>
          <span className="text-lg">With:</span>
          {selected.map((u) => (
            <span key={u} className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-sm text-primary">
              <Avatar name={byUserId.get(u)?.name ?? '?'} src={byUserId.get(u)?.image} className="size-5" />
              {byUserId.get(u)?.name}
              <button onClick={() => setSelected((s) => s.filter((x) => x !== u))} aria-label="Remove">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !q) setSelected((s) => s.slice(0, -1));
              if (e.key === 'Enter' && selected.length) start();
            }}
            placeholder={selected.length ? '' : '#a-channel, @somebody, or somebody'}
            className="min-w-60 flex-1 bg-transparent py-1 text-lg outline-none placeholder:text-muted-foreground"
          />
        </div>
        {matches.length > 0 && (
          <div className="absolute left-6 right-6 top-full z-10 mt-1 max-w-xl rounded-lg border bg-popover p-1 shadow-xl">
            {matches.map((m) => (
              <button
                key={m.id}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  if (m.kind === 'channel') return router.push(`/${slug}/home/c/${m.id}`);
                  setSelected((s) => [...s, m.id]);
                  setQ('');
                  input.current?.focus();
                }}
              >
                {m.kind === 'person' && <Avatar name={m.label} src={byUserId.get(m.id)?.image} className="size-7" />}
                <span className="font-medium">{m.label}</span>
                <span className="text-sm text-muted-foreground">{m.sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 items-end justify-end p-6">
        <Button size="lg" onClick={start} disabled={selected.length === 0 || open.isPending}>
          Start conversation
        </Button>
      </div>
    </main>
  );
}
