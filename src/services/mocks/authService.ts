import { DEMO_ACCOUNTS } from "@/data/demoAccounts";
import { ApiError } from "@/lib/http";
import { clearSession, readSession, writeSession } from "@/lib/session";
import type { AuthSession, LoginCredentials, User } from "@/types";
import type { AuthService } from "@/services/interfaces";
import { demoDb } from "./store";
import { respond } from "./utils";

function allUsers(): User[] {
  const db = demoDb.get();
  return [
    ...db.patients,
    ...db.doctors,
    ...db.hospitalAdmins,
    ...db.superAdmins,
  ];
}

export function findUserByEmail(email: string): User | undefined {
  const normalised = email.trim().toLowerCase();
  return allUsers().find((user) => user.email.toLowerCase() === normalised);
}

/**
 * MOCK ONLY — there is no real authentication yet.
 *
 * Any role can sign in with the demo credentials listed in `DEMO_ACCOUNTS`.
 * Frontend route guards are a UX convenience, not a security boundary: the
 * backend must enforce authorization on every request.
 */
export class MockAuthService implements AuthService {
  login({ email, password }: LoginCredentials): Promise<AuthSession> {
    return respond(() => {
      const account = DEMO_ACCOUNTS.find(
        (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
      );

      if (!account || account.password !== password) {
        throw new ApiError({
          status: 401,
          message: "Invalid email or password. Try one of the demo accounts below.",
        });
      }

      const user = allUsers().find(
        (candidate) => candidate.email.toLowerCase() === account.email.toLowerCase(),
      );
      if (!user) {
        throw new ApiError({
          status: 404,
          message: "This demo account has no profile in the demo dataset.",
        });
      }

      const session: AuthSession = {
        user,
        token: `mock-token-${user.id}`,
        hospitalId:
          "hospitalId" in user
            ? (user as { hospitalId?: string }).hospitalId
            : undefined,
      };

      writeSession(session);
      return session;
    });
  }

  async logout(): Promise<void> {
    clearSession();
  }

  getSession(): AuthSession | null {
    return readSession();
  }

  async getCurrentUser(): Promise<User | null> {
    return readSession()?.user ?? null;
  }
}
