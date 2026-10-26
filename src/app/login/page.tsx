'use client';

import { CircleCheck } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AuthShowcase } from '@/components/auth/auth-showcase';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient, signIn } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const PASSWORD_AUTH = process.env.NODE_ENV !== 'production';
const MIN_PASSWORD = 8;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

const primaryButton =
  'flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-foreground text-sm font-semibold text-background transition-colors hover:bg-foreground/85 disabled:opacity-50';
const outlineButton =
  'flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50';
const inputClass = 'h-11 rounded-lg';

function LoginForm() {
  const next = useSearchParams().get('next') ?? '/';
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');

  const google = async () => {
    setBusy(true);
    const { error } = await signIn.social({ provider: 'google', callbackURL: next });
    if (error) {
      toast.error(
        error.code === 'PROVIDER_NOT_FOUND' ? 'Google sign-in is not configured yet.' : (error.message ?? 'Google sign-in failed'),
      );
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email'));
    setBusy(true);
    const { error } =
      mode === 'up'
        ? await authClient.signUp.email({ email, password, name: email.split('@')[0]! })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) return void toast.error(error.message ?? 'Could not sign in');
    window.location.href = next;
  };

  const longEnough = password.length >= MIN_PASSWORD;

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-2 lg:gap-4 lg:p-4">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-512.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">
            Nova<span className="text-primary">Chat</span>
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="text-center">
            <h1 className="text-xl font-bold">{PASSWORD_AUTH && mode === 'in' ? 'Welcome back' : 'Get started with NovaChat'}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Chat, share files and meet with your team in one place.</p>
          </div>

          {PASSWORD_AUTH && (
            <>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <Field label="Email">
                  <Input name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={inputClass} />
                </Field>
                <div className="space-y-3">
                  <Field label="Password">
                    <Input
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={MIN_PASSWORD}
                      required
                      autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                      className={inputClass}
                    />
                  </Field>
                  {mode === 'up' && (
                    <p className={cn('flex items-center gap-2 text-sm', longEnough ? 'text-foreground' : 'text-muted-foreground')}>
                      <CircleCheck className={cn('size-5 text-white', longEnough ? 'fill-green-600' : 'fill-muted-foreground/30')} />
                      Must be at least {MIN_PASSWORD} characters
                    </p>
                  )}
                </div>
                <button type="submit" className={primaryButton} disabled={busy}>
                  {mode === 'up' ? 'Create account' : 'Sign in'}
                </button>
              </form>

              <div className="my-8 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className={PASSWORD_AUTH ? outlineButton : cn(primaryButton, 'mt-8')}
          >
            <span className={cn(!PASSWORD_AUTH && 'grid size-7 place-items-center rounded-full bg-white')}>
              <GoogleIcon />
            </span>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {PASSWORD_AUTH ? (
              <>
                {mode === 'up' ? 'Already have an account?' : 'New to NovaChat?'}{' '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'up' ? 'in' : 'up')}
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  {mode === 'up' ? 'Sign in' : 'Create an account'}
                </button>
              </>
            ) : (
              'New here? Continuing with Google creates your account.'
            )}
          </p>
        </div>
      </section>

      <AuthShowcase />
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
