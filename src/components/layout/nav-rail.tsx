'use client';

import { Bell, FolderClosed, House, MessagesSquare, PhoneCall, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { UserMenu } from './user-menu';
import { useWorkspace } from './workspace-context';

const items: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: 'home', label: 'Home', icon: House },
  { href: 'dms', label: 'DMs', icon: MessagesSquare },
  { href: 'people', label: 'People', icon: User },
  { href: 'files', label: 'Files', icon: FolderClosed },
  { href: 'buzz', label: 'Buzz', icon: PhoneCall },
];

export function NavRail({ unread = 0 }: { unread?: number }) {
  const { slug } = useWorkspace();
  const pathname = usePathname();
  const active = (segment: string) => pathname.startsWith(`/${slug}/${segment}`);

  return (
    <nav className="flex w-[88px] shrink-0 flex-col items-center gap-1 rounded-xl bg-rail py-4 text-white">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={`/${slug}/${href}`}
          className={cn(
            'flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-xs',
            !active(href) && 'hover:bg-white/10',
          )}
        >
          <span className={cn('grid size-11 place-items-center rounded-lg', active(href) && 'bg-rail-active')}>
            <Icon className="size-6" />
          </span>
          {label}
        </Link>
      ))}

      <div className="mt-auto flex flex-col items-center gap-3">
        <Link
          href={`/${slug}/notifications`}
          className={cn('relative grid size-10 place-items-center rounded-lg hover:bg-white/10', active('notifications') && 'bg-rail-active')}
          aria-label="Notifications"
        >
          <Bell className="size-6" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] font-bold">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <Link
          href={`/${slug}/settings/account`}
          className={cn('grid size-10 place-items-center rounded-lg hover:bg-white/10', active('settings') && 'bg-rail-active')}
          aria-label="Settings"
        >
          <Settings className="size-6" />
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
