const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const ERROR_CODE_KEYS: Record<string, string> = {
  INSUFFICIENT_STOCK: 'errors.insufficientStock',
  MUST_CONFIRM_FIRST: 'errors.mustConfirmFirst',
  ONLY_DRAFT_CONFIRM: 'errors.onlyDraftConfirm',
  ALREADY_DELIVERED: 'errors.alreadyDelivered',
  ALREADY_RECEIVED: 'errors.alreadyReceived',
  CANNOT_CANCEL_DELIVERED: 'errors.cannotCancelDelivered',
  ORDER_NOT_FOUND: 'errors.orderNotFound',
};

export type ApiError = Error & { code?: string; i18nKey?: string };

function parseApiError(json: object, fallback: string): ApiError {
  const j = json as {
    message?: string | string[] | { code?: string; message?: string };
    error?: string | { message?: string; code?: string };
    code?: string;
  };

  let code: string | undefined;
  let raw = fallback;

  if (typeof j.message === 'object' && j.message && !Array.isArray(j.message)) {
    code = j.message.code;
    raw = j.message.message || fallback;
  } else if (typeof j.message === 'string') {
    raw = j.message;
  } else if (Array.isArray(j.message)) {
    raw = j.message.join(', ');
  }

  if (!code && typeof j.error === 'object' && j.error) {
    code = j.error.code;
  }
  if (!code) code = j.code;

  // fallback: match English message
  if (!code && /insufficient stock/i.test(raw)) code = 'INSUFFICIENT_STOCK';

  const err = new Error(raw) as ApiError;
  err.code = code;
  err.i18nKey = code ? ERROR_CODE_KEYS[code] : undefined;
  return err;
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
      if (!retry.ok) throw parseApiError(json, 'Request failed');
      return (json.data ?? json) as T;
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw parseApiError(json, 'Request failed');
  return (json.data ?? json) as T;
}
