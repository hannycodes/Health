import {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_STORAGE_KEY,
} from "@/constants";
import type { AuthSession } from "@/types";

/**
 * Session persistence shared by the mock and HTTP auth implementations.
 *
 * `remember: true` keeps the session in localStorage; `false` keeps it in
 * sessionStorage so closing the tab signs the user out. Neither store is a
 * security boundary — a real backend should issue an HTTP-only cookie and
 * enforce authorization on every request.
 */

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user?.id) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      parseSession(window.localStorage.getItem(AUTH_STORAGE_KEY)) ??
      parseSession(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY))
    );
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession, remember = true) {
  if (typeof window === "undefined") return;
  try {
    if (remember) {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.sessionStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    }
  } catch {
    // Private browsing can block storage; the in-memory React state still works.
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
