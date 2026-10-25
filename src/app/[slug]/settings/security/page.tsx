'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Laptop } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authClient, useSession } from '@/lib/auth-client';

export default function SecurityPage() {
  const { data: current } = useSession();
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: async () => (await authClient.listSessions()).data ?? [],
  });

  const revokeOthers = useMutation({
    mutationFn: () => authClient.revokeOtherSessions(),
    onSuccess: () => {
      toast.success('Signed out of all other sessions');
      refetch();
    },
  });

  const revoke = useMutation({
    mutationFn: (token: string) => authClient.revokeSession({ token }),
    onSuccess: () => refetch(),
  });

  return (
    <section>
      <h2 className="text-xl font-semibold">Security</h2>
      <p className="mt-1 text-muted-foreground">You sign in with Google. Manage where you are signed in.</p>
      <div className="mt-6 divide-y rounded-xl border">
        {sessions.map((s) => {
          const isCurrent = s.id === current?.session.id;
          return (
            <div key={s.id} className="flex items-center gap-4 p-4">
              <Laptop className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress ?? 'Unknown IP'} · active {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                </p>
              </div>
              {isCurrent ? (
                <span className="text-xs font-medium text-green-600">This device</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => revoke.mutate(s.token)}>
                  Sign out
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {sessions.length > 1 && (
        <Button variant="destructive" className="mt-6" onClick={() => revokeOthers.mutate()}>
          Sign out of all other sessions
        </Button>
      )}
    </section>
  );
}
