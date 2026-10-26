'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api';
import { WAKE_INTERVAL_MS, hasWakeTargets, wakeServices } from '@/lib/wake';

const WAKING_STATUSES = new Set([502, 503, 504]);
const WAKING_RETRIES = 6;

const shouldRetry = (failureCount: number, error: unknown) =>
  error instanceof ApiError && WAKING_STATUSES.has(error.status) ? failureCount < WAKING_RETRIES : failureCount < 1;

const retryDelay = (attempt: number) => Math.min(2_000 * 2 ** attempt, 15_000);

function useWakeServices() {
  useEffect(() => {
    if (!hasWakeTargets) return;
    void wakeServices();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void wakeServices();
    }, WAKE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: shouldRetry, retryDelay, refetchOnWindowFocus: false } },
      }),
  );
  useWakeServices();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
