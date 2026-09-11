import { localStorageKey } from './constants';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
  success: boolean;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Clears the stored session and redirects to the login page when the server
 * rejects an authenticated request with 401 (expired/invalid token). Guarded so
 * only the first failing response triggers the redirect, which also stops the
 * client from spamming unauthenticated requests (e.g. polling loops) once the
 * session has expired.
 */
function handleUnauthorizedSession(): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const redirectKey = localStorageKey('session_redirected_to_login');
    if (sessionStorage.getItem(redirectKey)) return;
    sessionStorage.setItem(redirectKey, '1');
  } catch {
    // sessionStorage may be unavailable; a redirect loop here is still
    // preferable to silently staying on a broken page, so continue anyway.
  }

  for (const key of [
    'session_token',
    'session_user_uuid',
    'session_time_created',
    'session_expires_at',
  ]) {
    localStorage.removeItem(localStorageKey(key));
  }

  if (typeof location !== 'undefined' && !/^\/auth\/(login|register)/.test(location.pathname)) {
    location.href = '/auth/login';
  }
}

class ApiHandler {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number = 10000;
  private readonly defaultRetries: number = 3;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
    } = options;

    // Read token from localStorage (safe for environments without localStorage)
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(localStorageKey('session_token'))
        : null;

    // Detect if an Authorization header was already provided (case-insensitive)
    const hasAuthHeader = Object.keys(headers).some(k => k.toLowerCase() === 'authorization');

    // Merge headers and attach Authorization if token exists and caller didn't provide one
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (token && !hasAuthHeader) {
      mergedHeaders['authorization'] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: mergedHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = (await response.json().catch(() => null)) as T | null;

        if (!response.ok) {
          throw new ApiError(
            data && typeof data === 'object' && 'error' in data
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                ((data as any).error as string)
              : `API request failed with status ${response.status}`,
            response.status
          );
        }

        return {
          data: data as T,
          error: null,
          status: response.status,
          success: true,
        };
      } catch (error) {
        if (error instanceof ApiError) {
          lastError = error;
          if (error.status === 401) {
            handleUnauthorizedSession();
          }
          break; // Do not retry on API errors
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          await this.exponentialBackoff(attempt);
        }
      }
    }

    return {
      data: null,
      error: lastError,
      status: 0,
      success: false,
    };
  }

  async get<T = unknown>(
    endpoint: string,
    options?: Omit<ApiRequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T = unknown>(
    endpoint: string,
    options?: Omit<ApiRequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const API_BASE = import.meta.env.DEV ? '/api' : 'https://api.monixga.me:6200/api';

export const api = new ApiHandler(API_BASE);
