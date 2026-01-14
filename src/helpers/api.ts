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

class ApiHandler {
  private baseUrl: string;
  private defaultTimeout: number = 10000;
  private defaultRetries: number = 3;

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
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return {
          data: data as T,
          error: null,
          status: response.status,
          success: true,
        };
      } catch (error) {
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

const API_BASE = import.meta.env.DEV
  ? '/api'
  : ('https://monix-api.proplayer919.dev/api');

export const api = new ApiHandler(API_BASE);
