'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useWorkspaceBySlug } from '@/hooks/use-workspaces';
import { NavRail } from '@/components/layout/nav-rail';
import { TopBar } from '@/components/layout/top-bar';
import { WorkspaceProvider } from '@/components/layout/workspace-context';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import { SearchDialog } from '@/components/search/search-dialog';
import { useUnreadNotifications } from '@/hooks/use-notifications';
import { ApiError } from '@/lib/api';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: workspace, error } = useWorkspaceBySlug(slug);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (workspace) localStorage.setItem('novachat:last-workspace', workspace.slug);
  }, [workspace]);

  useEffect(() => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) router.replace('/');
  }, [error, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!workspace) {
    return <div className="grid min-h-dvh place-items-center bg-topbar text-sm text-white/70">Loading workspace…</div>;
  }

  return (
    <WorkspaceProvider workspace={workspace}>
      <RealtimeProvider>
        <div className="flex h-dvh flex-col bg-topbar">
          <TopBar onSearch={() => setSearchOpen(true)} />
          <div className="flex min-h-0 flex-1 gap-0 p-3 pt-0">
            <RailWithBadge />
            <div className="ml-3 flex min-w-0 flex-1 overflow-hidden rounded-xl bg-background">{children}</div>
          </div>
        </div>
        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </RealtimeProvider>
    </WorkspaceProvider>
  );
}

function RailWithBadge() {
  const { data: unread = 0 } = useUnreadNotifications();
  return <NavRail unread={unread} />;
}
