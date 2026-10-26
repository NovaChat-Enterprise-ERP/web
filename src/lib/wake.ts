const WAKE_URLS = (process.env.NEXT_PUBLIC_WAKE_URLS ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const WAKE_INTERVAL_MS = 10 * 60_000;

export const hasWakeTargets = WAKE_URLS.length > 0;

export function wakeServices(): Promise<unknown> {
  return Promise.all(
    WAKE_URLS.map((url) => fetch(`${url}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined)),
  );
}
