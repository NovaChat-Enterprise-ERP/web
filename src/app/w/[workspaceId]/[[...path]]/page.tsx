'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { WorkspaceDto } from '@novachat-enterprise-erp/contracts';
import { api } from '@/lib/api';

export default function WorkspaceIdRedirect() {
  const { workspaceId, path = [] } = useParams<{ workspaceId: string; path?: string[] }>();
  const router = useRouter();
  const { data, error } = useQuery({ queryKey: ['workspace-by-id', workspaceId], queryFn: () => api<WorkspaceDto>(`/workspaces/${workspaceId}`), retry: false });

  useEffect(() => {
    if (data) router.replace(`/${data.slug}/${path.length ? path.join('/') : 'home'}${window.location.search}`);
    if (error) router.replace('/');
  }, [data, error, path, router]);

  return <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Opening…</main>;
}
