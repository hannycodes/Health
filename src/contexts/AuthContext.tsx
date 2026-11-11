import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { services } from "@/services";
import type { AuthSession, LoginCredentials, Role, User } from "@/types";

export interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  role: Role | null;
  /** Hospital id for hospital admins; undefined for every other role. */
  hospitalId?: string;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Mock authentication provider.
 *
 * The session is read from localStorage so a page refresh keeps the user
 * signed in. Frontend role checks are UX only — real authorization must be
 * enforced by the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    services.auth.getSession(),
  );

  // A stored session can outlive a server restart or token rotation: verify it
  // once on load so stale credentials sign the user out instead of 401-ing.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    services.auth
      .getCurrentUser()
      .then((user) => {
        if (!cancelled && !user) setSession(null);
      })
      .catch(() => {
        if (!cancelled) {
          void services.auth.logout();
          setSession(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = await services.auth.login(credentials);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    await services.auth.logout();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      role: session?.user.role ?? null,
      hospitalId: session?.hospitalId,
      isAuthenticated: Boolean(session?.user),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
