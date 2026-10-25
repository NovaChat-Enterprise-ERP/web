'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { InvitePreviewDto, WorkspaceSummaryDto } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const { data: invite, error } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api<InvitePreviewDto>(`/invites/${token}`),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => api<WorkspaceSummaryDto>(`/invites/${token}/accept`, { method: 'POST' }),
    onSuccess: (workspace) => router.replace(`/${workspace.slug}/home`),
    onError: (e) => toast.error(e.message),
  });

  const reasons: Record<string, string> = {
    expired: 'This invite has expired.',
    revoked: 'This invite was revoked.',
    exhausted: 'This invite has already been used.',
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-topbar px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-xl">
        {error && <p className="text-muted-foreground">This invite link is invalid.</p>}
        {!error && !invite && <p className="text-muted-foreground">Loading invite…</p>}
        {invite && (
          <>
            <Avatar name={invite.workspace.name} src={invite.workspace.logoUrl} className="mx-auto size-16 rounded-xl" />
            <h1 className="mt-4 text-2xl font-bold">Join {invite.workspace.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invite.inviterName ? `${invite.inviterName} invited you to collaborate.` : 'You have been invited to collaborate.'}
              {invite.email && ` This invite is for ${invite.email}.`}
            </p>
            {!invite.valid ? (
              <p className="mt-6 rounded-md bg-muted p-3 text-sm">{reasons[invite.reason ?? ''] ?? 'This invite is not valid.'}</p>
            ) : sessionLoading ? null : session ? (
              <Button className="mt-6 w-full" size="lg" onClick={() => accept.mutate()} disabled={accept.isPending}>
                {accept.isPending ? 'Joining…' : `Join as ${session.user.name}`}
              </Button>
            ) : (
              <Button className="mt-6 w-full" size="lg" onClick={() => router.push(`/login?next=/invite/${token}`)}>
                Sign in to accept
              </Button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
