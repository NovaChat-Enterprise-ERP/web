'use client';

import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  Layers,
  Lock,
  Palette,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
  Users,
  Webhook,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { PERMISSIONS, type Permission } from '@novachat-enterprise-erp/contracts';
import { SectionSidebar } from '@/components/layout/section-sidebar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { cn } from '@/lib/utils';

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }>; permission?: Permission; soon?: boolean };

const personal: Item[] = [
  { href: 'account', label: 'Account', icon: User },
  { href: 'notifications', label: 'Notifications', icon: Bell },
  { href: 'appearance', label: 'Appearance', icon: Palette },
  { href: 'security', label: 'Security', icon: Lock },
];

const organisation: Item[] = [
  { href: 'org/general', label: 'General', icon: Settings },
  { href: 'org/users', label: 'User Management', icon: Users, permission: PERMISSIONS.MEMBERS_MANAGE },
  { href: 'org/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: PERMISSIONS.ROLES_MANAGE },
  { href: 'org/webhooks', label: 'Webhooks', icon: Webhook, soon: true },
  { href: 'org/channels', label: 'Channel Management', icon: Layers, permission: PERMISSIONS.CHANNELS_MANAGE },
  { href: 'org/audit', label: 'Audit Log', icon: ScrollText, permission: PERMISSIONS.AUDIT_VIEW },
  { href: 'org/billing', label: 'Billing', icon: CreditCard, soon: true },
];

function Section({ title, icon: Icon, items }: { title: string; icon: ComponentType<{ className?: string }>; items: Item[] }) {
  const { slug, permissions } = useWorkspace();
  const pathname = usePathname();
  const visible = items.filter((i) => !i.permission || permissions.includes(i.permission));
  if (visible.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-2 text-[15px] text-sidebar-muted">
        <ChevronDown className="size-4" />
        <Icon className="hidden" />
        {title}
      </div>
      {visible.map(({ href, label, icon: ItemIcon, soon }) => {
        const active = pathname === `/${slug}/settings/${href}`;
        const className = cn(
          'flex items-center gap-3 rounded-md px-4 py-2.5 text-[15px]',
          active ? 'bg-rail-active font-semibold text-white' : 'hover:bg-sidebar-hover',
          soon && 'pointer-events-none opacity-50',
        );
        return soon ? (
          <span key={href} className={className}>
            <ItemIcon className="size-5" /> {label}
            <span className="ml-auto text-[11px] uppercase">Soon</span>
          </span>
        ) : (
          <Link key={href} href={`/${slug}/settings/${href}`} className={className}>
            <ItemIcon className="size-5" /> {label}
          </Link>
        );
      })}
    </div>
  );
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionSidebar>
        <Section title="Personal" icon={User} items={personal} />
        <Section title="Organisation" icon={Building2} items={organisation} />
      </SectionSidebar>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-b px-10 py-5">
          <h1 className="text-xl font-semibold">Settings</h1>
        </header>
        <div className="max-w-5xl px-10 py-8">{children}</div>
      </main>
    </>
  );
}
