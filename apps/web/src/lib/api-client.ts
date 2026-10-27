import type { ApiErrorBody, ApiErrorDetail, AuthResponseDto } from '@shop/shared';

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[] | undefined;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function getErrorMessage(e: unknown, fallback = 'Bir hata oluştu. Lütfen tekrar deneyin.'): string {
  if (isApiError(e)) return e.message || fallback;
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

interface TokenHandlers {
  getAccessToken: () => string | null;
  onRefreshed: (data: AuthResponseDto) => void;
  onSessionExpired: () => void;
}

let handlers: TokenHandlers = {
  getAccessToken: () => null,
  onRefreshed: () => undefined,
  onSessionExpired: () => undefined,
};

/** Auth store'un kendini api-client'a bağlaması için. */
export function configureApiAuth(h: TokenHandlers) {
  handlers = h;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** 401 alınca refresh denemesi yapma (auth endpoint'leri için). */
  skipAuthRefresh?: boolean;
  /** Authorization header'ı gönderme. */
  anonymous?: boolean;
  /** Gövde FormData ise Content-Type otomatik ayarlanır. */
  formData?: FormData;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length) url.searchParams.set(k, v.join(','));
      } else url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

// ---- Refresh kuyruğu: aynı anda yalnızca bir refresh isteği yapılır ----
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'fetch' },
        });
        if (!res.ok) return false;
        const json = (await res.json()) as { data: AuthResponseDto };
        handlers.onRefreshed(json.data);
        return true;
      } catch {
        return false;
      } finally {
        // Kısa gecikme: aynı tick'teki istekler aynı promise'i paylaşsın
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

/** Uygulama açılışında oturumu geri yüklemek için dışa açık. */
export function tryRefreshSession(): Promise<boolean> {
  return refreshAccessToken();
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    body = null;
  }
  const code = body?.error?.code ?? (res.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR');
  const message =
    body?.error?.message ??
    (res.status === 429
      ? 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.'
      : res.status >= 500
        ? 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
        : 'İstek başarısız oldu.');
  return new ApiError(res.status, code, message, body?.error?.details);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, headers = {}, signal, timeoutMs = 15000, skipAuthRefresh, anonymous, formData } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException('Zaman aşımı', 'TimeoutError')), timeoutMs);
  const onOuterAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onOuterAbort, { once: true });

  const doFetch = async (retry: boolean): Promise<T> => {
    const token = anonymous ? null : handlers.getAccessToken();
    const init: RequestInit = {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
        ...(formData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    };

    let res: Response;
    try {
      res = await fetch(buildUrl(path, query), init);
    } catch (e) {
      if ((e as Error).name === 'AbortError' && signal?.aborted) throw e;
      if ((e as Error).name === 'TimeoutError' || (e as DOMException).name === 'TimeoutError' || controller.signal.aborted) {
        throw new ApiError(0, 'TIMEOUT', 'Sunucu yanıt vermedi. Lütfen bağlantınızı kontrol edin.');
      }
      throw new ApiError(0, 'NETWORK_ERROR', 'Sunucuya ulaşılamıyor. Lütfen bağlantınızı kontrol edin.');
    }

    if (res.status === 401 && !skipAuthRefresh && !anonymous && retry && token) {
      const ok = await refreshAccessToken();
      if (ok) return doFetch(false);
      handlers.onSessionExpired();
    }

    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  };

  try {
    return await doFetch(true);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
