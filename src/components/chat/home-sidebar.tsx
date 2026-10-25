'use client';

import { ChevronDown, ChevronRight, Hash, Lock, MessageSquareText, Plus, Search, SquarePen } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { PERMISSIONS, type ConversationDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { SectionSidebar } from '@/components/layout/section-sidebar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useRealtime } from '@/components/realtime/realtime-provider';
import { useCan } from '@/hooks/use-can';
import { useConversationTitle, useConversations } from '@/hooks/use-conversations';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { CreateChannelDialog } from './create-channel-dialog';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-3">
      <div className="group flex items-center justify-between px-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 py-1 text-[15px] text-sidebar-muted hover:text-white">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {title}
        </button>
        {action}
      </div>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function Row({ conversation, href, icon }: { conversation: ConversationDto; href: string; icon: ReactNode }) {
  const pathname = usePathname();
  const title = useConversationTitle();
  const active = pathname === href;
  const unread = conversation.membership?.unreadCount ?? 0;
  const mentions = conversation.membership?.mentionCount ?? 0;
  const muted = conversation.membership?.muted;
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-[15px]',
        active ? 'bg-rail-active text-white' : 'hover:bg-sidebar-hover',
        unread > 0 && !muted && !active && 'font-bold text-white',
        muted && 'opacity-60',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{title(conversation)}</span>
      {mentions > 0 && !active && <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{mentions}</span>}
    </Link>
  );
}

export function HomeSidebar() {
  const { slug } = useWorkspace();
  const pathname = usePathname();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { data: conversations = [] } = useConversations();
  const { byUserId } = useMembers();
  const { online } = useRealtime();
  const { data: session } = useSession();
  const canCreate = useCan(PERMISSIONS.CHANNELS_CREATE);

  const channels = conversations.filter((c) => c.type === 'public_channel' || c.type === 'private_channel').filter((c) => !c.archivedAt || c.id === conversationId);
  const directs = conversations
    .filter((c) => c.type === 'dm' || c.type === 'group_dm')
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));

  const dmIcon = (c: ConversationDto) => {
    const other = c.participantIds.find((u) => u !== session?.user.id) ?? session?.user.id ?? '';
    const member = byUserId.get(other);
    if (c.type === 'group_dm') {
      return <span className="grid size-6 place-items-center rounded bg-white/15 text-[11px] font-bold">{c.participantIds.length}</span>;
    }
    return (
      <span className="relative">
        <Avatar name={member?.name ?? '?'} src={member?.image} className="size-6" />
        <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar', online.has(other) && !member?.isAway ? 'bg-green-400' : 'bg-sidebar-muted')} />
      </span>
    );
  };

  const iconButton = 'rounded p-1 text-sidebar-muted opacity-0 hover:bg-sidebar-hover hover:text-white group-hover:opacity-100';

  return (
    <SectionSidebar className="w-[300px] gap-0">
      <Link
        href={`/${slug}/home/threads`}
        className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-[15px] hover:bg-sidebar-hover', pathname.endsWith('/threads') && 'bg-rail-active text-white')}
      >
        <MessageSquareText className="size-5" /> Threads
      </Link>
      <Link
        href={`/${slug}/home/browse`}
        className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-[15px] hover:bg-sidebar-hover', pathname.endsWith('/browse') && 'bg-rail-active text-white')}
      >
        <Search className="size-5" /> Browse channels
      </Link>

      <Section
        title="Channels"
        action={
          canCreate && (
            <CreateChannelDialog trigger={<button className={iconButton} aria-label="Create channel"><Plus className="size-4" /></button>} />
          )
        }
      >
        {channels.map((c) => (
          <Row
            key={c.id}
            conversation={c}
            href={`/${slug}/home/c/${c.id}`}
            icon={c.type === 'private_channel' ? <Lock className="size-4 shrink-0" /> : <Hash className="size-4 shrink-0" />}
          />
        ))}
      </Section>

      <Section
        title="People"
        action={
          <Link href={`/${slug}/home/people/new-chat`} className={iconButton} aria-label="New message">
            <SquarePen className="size-4" />
          </Link>
        }
      >
        {directs.length === 0 && <p className="px-3 py-1 text-sm text-sidebar-muted">No recent chats. Start a new conversation!</p>}
        {directs.map((c) => (
          <Row key={c.id} conversation={c} href={`/${slug}/home/c/${c.id}`} icon={dmIcon(c)} />
        ))}
        <Link href={`/${slug}/people`} className="mx-1 mt-2 flex items-center justify-between rounded-md border border-white/15 px-3 py-2 text-[15px] hover:bg-sidebar-hover">
          View all people <ChevronRight className="size-4" />
        </Link>
      </Section>
    </SectionSidebar>
  );
}
