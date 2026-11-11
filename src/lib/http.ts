import axios, { AxiosError, type AxiosInstance } from "axios";
import { AUTH_STORAGE_KEY } from "@/constants";

export interface ApiErrorShape {
  status: number;
  message: string;
  details?: unknown;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  details?: unknown;

  constructor({ status, message, details }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
  (error: AxiosError<{ message?: string; detail?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      error.response?.data?.detail ??
      error.message ??
      "Unexpected network error";

    return Promise.reject(
      new ApiError({ status, message, details: error.response?.data }),
    );
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
