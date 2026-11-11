import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SESSION_EXPIRED_EVENT } from "@/constants";
import { services } from "@/services";
import type {
  AccountStatus,
  AuthSession,
  ForgotPasswordResponse,
  LoginCredentials,
  PatientRegistrationRequest,
  RegistrationResponse,
  Role,
  User,
} from "@/types";

export interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  role: Role | null;
  /** Hospital id for hospital admins and doctors; undefined for other roles. */
  hospitalId?: string;
  status?: AccountStatus;
  isAuthenticated: boolean;
  /** True while the initial session is being restored. */
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => Promise<void>;
  registerPatient: (
    data: PatientRegistrationRequest,
  ) => Promise<RegistrationResponse>;
  refreshUser: () => Promise<User | null>;
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hospitalIdOf(user: User): string | undefined {
  return "hospitalId" in user
    ? (user as { hospitalId?: string }).hospitalId
    : undefined;
}

/**
 * Shared authentication provider for every role.
 *
 * The mock implementation persists the session in browser storage so a refresh
 * keeps the user signed in. Frontend role checks are UX only — real
 * authorization must be enforced by the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    services.auth.getSession(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Restore the freshest profile (and status) from the service on boot.
  useEffect(() => {
    let cancelled = false;

    services.auth
      .getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setSession((previous) => {
          if (!user) return null;
          const base = previous ?? {
            user,
            token: `session-${user.id}`,
          };
          return { ...base, user, hospitalId: hospitalIdOf(user) };
        });
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The Axios client emits this event when the backend rejects the session.
  useEffect(() => {
    function handleExpired() {
      setSession(null);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = await services.auth.login(credentials);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    await services.auth.logout();
    setSession(null);
  }, []);

  const registerPatient = useCallback(
    (data: PatientRegistrationRequest) => services.auth.registerPatient(data),
    [],
  );

  const refreshUser = useCallback(async () => {
    const user = await services.auth.getCurrentUser();
    if (!user) {
      setSession(null);
      return null;
    }
    setSession((previous) =>
      previous
        ? { ...previous, user, hospitalId: hospitalIdOf(user) }
        : { user, token: `session-${user.id}` },
    );
    return user;
  }, []);

  const forgotPassword = useCallback(
    (email: string) => services.auth.forgotPassword(email),
    [],
  );

  const resetPassword = useCallback(
    (token: string, newPassword: string) =>
      services.auth.resetPassword(token, newPassword),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      role: session?.user.role ?? null,
      hospitalId: session
        ? (session.hospitalId ?? hospitalIdOf(session.user))
        : undefined,
      status: session?.user.status ?? "ACTIVE",
      isAuthenticated: Boolean(session?.user),
      isLoading,
      login,
      logout,
      registerPatient,
      refreshUser,
      forgotPassword,
      resetPassword,
    }),
    [
      session,
      isLoading,
      login,
      logout,
      registerPatient,
      refreshUser,
      forgotPassword,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
