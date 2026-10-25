import type { ApiErrorBody } from '@novachat-enterprise-erp/contracts';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function api<T>(path: string, init: { method?: Method; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: init.signal,
  });
  if (response.status === 204) return undefined as T;
  const json = (await response.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      json?.error?.code ?? 'HTTP_ERROR',
      json?.error?.message ?? `Request failed (${response.status})`,
      json?.error?.details,
    );
  }
  return json as T;
}
