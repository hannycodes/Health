import { AUTH_STORAGE_KEY } from "@/constants";
import type { AuthSession } from "@/types";

/** Session persistence shared by the mock and HTTP auth implementations. */

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private browsing can block storage; the in-memory React state still works.
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}
