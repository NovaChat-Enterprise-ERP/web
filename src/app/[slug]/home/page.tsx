'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useConversations } from '@/hooks/use-conversations';

export default function HomePage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const { data } = useConversations();

  useEffect(() => {
    if (!data) return;
    const target = data.find((c) => c.isDefault && c.name === 'general') ?? data[0];
    if (target) router.replace(`/${slug}/home/c/${target.id}`);
  }, [data, router, slug]);

  return (
    <main className="grid flex-1 place-items-center text-sm text-muted-foreground">
      {data && data.length === 0 ? 'Setting up your channels…' : 'Loading…'}
    </main>
  );
}
