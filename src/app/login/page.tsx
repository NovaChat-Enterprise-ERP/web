'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient, signIn } from '@/lib/auth-client';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function LoginForm() {
  const next = useSearchParams().get('next') ?? '/';
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [showDevForm, setShowDevForm] = useState(false);

  const google = async () => {
    setBusy(true);
    const { error } = await signIn.social({ provider: 'google', callbackURL: next });
    if (error) {
      toast.error(
        error.code === 'PROVIDER_NOT_FOUND'
          ? 'Google sign-in is not configured yet. Use email and password below.'
          : (error.message ?? 'Google sign-in failed'),
      );
      if (error.code === 'PROVIDER_NOT_FOUND') setShowDevForm(true);
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setBusy(true);
    const { error } =
      mode === 'up'
        ? await authClient.signUp.email({ email, password, name: String(form.get('name') || email.split('@')[0]) })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) return void toast.error(error.message ?? 'Could not sign in');
    window.location.href = next;
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-topbar px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            N
          </div>
          <h1 className="text-2xl font-bold">Sign in to NovaChat</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chat, share files and meet with your community.</p>
        </div>

        <Button variant="outline" className="w-full text-foreground" size="lg" onClick={google} disabled={busy}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <button
          type="button"
          className="mt-6 w-full text-center text-xs text-muted-foreground hover:underline"
          onClick={() => setShowDevForm((v) => !v)}
        >
          Use email and password (development)
        </button>

        {showDevForm && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === 'up' && <Input name="name" placeholder="Full name" autoComplete="name" />}
            <Input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            <Input name="password" type="password" placeholder="Password (8+ characters)" minLength={8} required />
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === 'up' ? 'Create account' : 'Sign in'}
            </Button>
            <button
              type="button"
              className="w-full text-xs text-primary hover:underline"
              onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
            >
              {mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
