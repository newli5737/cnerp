const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

function getApiErrorMessage(json: object, fallback: string): string {
  const j = json as { message?: string; error?: { message?: string } };
  return j.message ?? j.error?.message ?? fallback;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && !path.includes('/auth/login')) {
    const ok = await tryRefresh();
    if (ok) {
      const retry = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const json = await retry.json();
      if (!retry.ok) throw new Error(getApiErrorMessage(json, 'Request failed'));
      return (json.data ?? json) as T;
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(json, 'Request failed'));
  return (json.data ?? json) as T;
}
