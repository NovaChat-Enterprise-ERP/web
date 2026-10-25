'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMyWorkspaces } from '@/hooks/use-workspaces';

export default function RootPage() {
  const router = useRouter();
  const { data, error } = useMyWorkspaces();

  useEffect(() => {
    if (!data) return;
    const last = typeof window !== 'undefined' ? localStorage.getItem('novachat:last-workspace') : null;
    const target = data.find((w) => w.slug === last) ?? data[0];
    router.replace(target ? `/${target.slug}/home` : '/onboarding');
  }, [data, router]);

  return (
    <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      {error ? `Could not load your workspaces: ${error.message}` : 'Loading your workspaces…'}
    </main>
  );
}
