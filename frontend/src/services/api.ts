import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE, TOKEN_STORAGE_KEY } from "@/config";
import { useAuthStore } from "@/store/auth";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

function readTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string; refreshToken?: string } };
    return {
      accessToken: parsed.state?.accessToken ?? null,
      refreshToken: parsed.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

api.interceptors.request.use((config) => {
  const { accessToken } = readTokens();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = readTokens();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
    useAuthStore.getState().setSession(data);
    return data.access_token as string;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes("/auth/");
    if (!original || original._retried || status !== 401 || isAuthCall) {
      return Promise.reject(error);
    }
    original._retried = true;
    refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => (refreshPromise = null));
    const token = await refreshPromise;
    if (token) {
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    useAuthStore.getState().clearSession();
    return Promise.reject(error);
  },
);

interface ErrorShape {
  error?: { message?: string; code?: string };
  detail?: unknown;
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ErrorShape | undefined;
    if (data?.error?.message) return data.error.message;
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        const parts: string[] = [];
        for (const d of data.detail as { loc?: unknown; msg?: string }[]) {
          const field = Array.isArray(d.loc) ? String(d.loc[d.loc.length - 1] ?? "") : "";
          if (d.msg) parts.push(field ? `${field}: ${d.msg}` : d.msg);
        }
        if (parts.length) return parts.slice(0, 3).join("\n");
      }
      if (typeof data.detail === "string") return data.detail;
    }
    if (err.message === "Network Error") return "Cannot reach the server. Is the backend running?";
    if (err.code === "ECONNABORTED") return "Request timed out. Please try again.";
    return err.message;
  }
  return "Unexpected error. Please try again.";
}

export function isValidationError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ErrorShape | undefined;
    const status = err.response?.status;
    return status === 422 || Boolean(data?.detail);
  }
  return false;
}