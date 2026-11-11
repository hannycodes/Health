import axios, { AxiosError, type AxiosInstance } from "axios";
import {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  SESSION_EXPIRED_EVENT,
} from "@/constants";
import { clearSession } from "@/lib/session";

export interface ApiErrorShape {
  status: number;
  message: string;
  /** Stable machine-readable code supplied by the backend, when available. */
  code?: string;
  details?: unknown;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  code?: string;
  details?: unknown;

  constructor({ status, message, code, details }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

/**
 * Shared Axios instance.
 *
 * Attaches the stored session token and normalises every failure into an
 * `ApiError` so feature code only has to handle one error shape. No endpoint
 * is called until the backend team publishes API_CONTRACT.md.
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw) as { token?: string };
      if (session.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    }
  } catch {
    // Ignore malformed session payloads; the request proceeds unauthenticated.
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; detail?: string; code?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      error.response?.data?.detail ??
      error.message ??
      "Unexpected network error";

    // A rejected session is cleared once, and the AuthProvider is told so every
    // protected route can redirect to /login with the intended destination.
    if (status === 401) {
      try {
        const hadSession =
          Boolean(window.localStorage.getItem(AUTH_STORAGE_KEY)) ||
          Boolean(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY));
        clearSession();
        if (hadSession) {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      } catch {
        // Storage access can fail in private mode; ignore.
      }
    }

    return Promise.reject(
      new ApiError({
        status,
        message,
        code: error.response?.data?.code,
        details: error.response?.data,
      }),
    );
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
