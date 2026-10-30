/**
 * Talks to the Chatimall server (Node + MongoDB).
 * - In development the Vite dev server proxies /api and /socket.io to localhost:4000, so API_BASE is empty.
 * - In the Android app (and any separate hosting) set VITE_API_URL=https://your-server.example.com
 */
const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const defaultProductionApiUrl = 'https://chatimall-backend-4.onrender.com';
export const API_BASE = (configuredApiUrl || (import.meta.env.PROD ? defaultProductionApiUrl : '')).replace(/\/$/, '');

const TOKEN_KEY = 'chatimall_token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null): void => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection.', 0, 'NETWORK');
  }

  const responseText = await res.text();
  let data: unknown = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Handle successful non-JSON responses below as a configuration/API error.
  }

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const errorData = data && typeof data === 'object' ? data as { error?: string; message?: string } : null;
    throw new ApiError(errorData?.message || errorData?.error || `Request failed (${res.status})`, res.status, errorData?.error ?? 'ERROR');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError(
      'The server returned an invalid response. Check the API URL configured for this app.',
      res.status,
      'INVALID_RESPONSE'
    );
  }
  return data as T;
}

/** Files are stored as "/api/files/<key>"; make them loadable from wherever the app is hosted. */
export const assetUrl = (u: string | null | undefined): string | null => {
  if (!u) return null;
  return u.startsWith('/') ? `${API_BASE}${u}` : u;
};

/** Reverse of assetUrl – what we send back to the server. */
export const storedUrl = (u: string | null | undefined): string | null => {
  if (!u) return null;
  return API_BASE && u.startsWith(API_BASE) ? u.slice(API_BASE.length) : u;
};
