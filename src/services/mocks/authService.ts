import { ApiError } from "@/lib/http";
import { clearSession, readSession, writeSession } from "@/lib/session";
import type {
  AuthSession,
  ForgotPasswordResponse,
  LoginCredentials,
  Patient,
  PatientRegistrationRequest,
  RegistrationResponse,
  User,
} from "@/types";
import type { AuthService } from "@/services/interfaces";
import { demoDb } from "./store";
import { createId, respond } from "./utils";

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

function hospitalIdOf(user: User): string | undefined {
  return "hospitalId" in user
    ? (user as { hospitalId?: string }).hospitalId
    : undefined;
}

/**
 * MOCK ONLY — authentication is simulated in the browser.
 *
 * Demo accounts and accounts registered during the session are held in the
 * shared demo database. Frontend route guards remain a UX convenience: the
 * backend must enforce authorization on every request.
 */
export class MockAuthService implements AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const email = credentials.email.trim().toLowerCase();

    const user = allUsers().find(
      (candidate) => candidate.email.toLowerCase() === email,
    );
    const credential = demoDb
      .get()
      .credentials.find((candidate) => candidate.email.toLowerCase() === email);

    if (!user || !credential || credential.password !== credentials.password) {
      throw new ApiError({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password. Try one of the demo accounts below.",
      });
    }

    this.assertLoginAllowed(user);

    const remember = credentials.remember ?? true;
    const ttlMinutes = remember ? 8 * 60 : 60;
    const session: AuthSession = {
      user,
      token: `mock-token-${user.id}`,
      hospitalId: hospitalIdOf(user),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
    };

    writeSession(session, remember);
    return respond(() => session, 80);
  }

  async registerPatient(
    data: PatientRegistrationRequest,
  ): Promise<RegistrationResponse> {
    const email = data.email.trim().toLowerCase();

    if (!data.acceptedTerms || !data.acceptedPrivacy) {
      throw new ApiError({
        status: 400,
        code: "CONSENT_REQUIRED",
        message:
          "You must accept the terms of service and the privacy notice to create an account.",
      });
    }

    if (
      allUsers().some((user) => user.email.toLowerCase() === email) ||
      demoDb.get().credentials.some((item) => item.email.toLowerCase() === email)
    ) {
      throw new ApiError({
        status: 409,
        code: "EMAIL_TAKEN",
        message: "An account with this email address already exists.",
      });
    }

    const patient: Patient = {
      id: createId("pat"),
      email,
      fullName: data.fullName.trim(),
      role: "PATIENT",
      phone: data.phone.trim(),
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.gender,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    // A real backend hashes the password and may hold the account in a pending
    // state until the e-mail address is verified.
    demoDb.mutate((db) => {
      db.patients = [...db.patients, patient];
      db.credentials = [
        ...db.credentials,
        { userId: patient.id, email, password: data.password },
      ];
    });

    return respond(
      () => ({ user: { ...patient }, requiresVerification: false }),
      220,
    );
  }

  async logout(): Promise<void> {
    clearSession();
  }

  getSession(): AuthSession | null {
    return readSession();
  }

  async getCurrentUser(): Promise<User | null> {
    const session = readSession();
    if (!session) return null;

    const fresh = allUsers().find((user) => user.id === session.user.id);
    if (!fresh) return null;

    const { user: _stale, ...rest } = session;
    writeSession({ ...rest, user: { ...fresh } }, true);
    return { ...fresh };
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const normalised = email.trim().toLowerCase();
    const user = allUsers().find(
      (candidate) => candidate.email.toLowerCase() === normalised,
    );

    // Always resolve so the response never reveals whether the address exists.
    if (!user) return respond(() => ({}), 200);

    const token = createId("rst");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 60 * 60_000);

    demoDb.mutate((db) => {
      db.passwordResets = [
        ...db.passwordResets,
        {
          token,
          userId: user.id,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      ];
    });

    // MOCK ONLY: no e-mail is sent, so the token is handed back for the demo.
    return respond(() => ({ devResetToken: token }), 200);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const reset = demoDb
      .get()
      .passwordResets.find((item) => item.token === token);

    if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) {
      throw new ApiError({
        status: 400,
        code: "RESET_TOKEN_INVALID",
        message: "This reset link is invalid or has expired. Request a new one.",
      });
    }

    const user = allUsers().find((candidate) => candidate.id === reset.userId);
    if (!user) {
      throw new ApiError({
        status: 400,
        code: "RESET_TOKEN_INVALID",
        message: "This reset link is invalid or has expired. Request a new one.",
      });
    }

    demoDb.mutate((db) => {
      const credential = db.credentials.find(
        (item) => item.userId === reset.userId,
      );
      if (credential) {
        credential.password = newPassword;
      } else {
        db.credentials = [
          ...db.credentials,
          {
            userId: reset.userId,
            email: user.email,
            password: newPassword,
          },
        ];
      }
      db.passwordResets = db.passwordResets.filter(
        (item) => item.userId !== reset.userId,
      );
    });

    await respond(() => undefined, 160);
  }

  /** Reject accounts the platform has not cleared, with a stable error code. */
  private assertLoginAllowed(user: User) {
    const status = user.status ?? "ACTIVE";

    if (status === "PENDING") {
      throw new ApiError({
        status: 403,
        code: "ACCOUNT_PENDING",
        message:
          "Your account is awaiting approval. You can review its status on the pending account page.",
      });
    }
    if (status === "SUSPENDED") {
      throw new ApiError({
        status: 403,
        code: "ACCOUNT_SUSPENDED",
        message:
          "This account has been suspended. Contact platform support if you believe this is a mistake.",
      });
    }
    if (status === "DISABLED") {
      throw new ApiError({
        status: 403,
        code: "ACCOUNT_DISABLED",
        message:
          "This account has been disabled. Contact platform support for help.",
      });
    }

    const hospitalId = hospitalIdOf(user);
    if (!hospitalId) return;

    const hospital = demoDb
      .get()
      .hospitals.find((candidate) => candidate.id === hospitalId);
    if (!hospital) return;

    if (hospital.approvalStatus !== "APPROVED") {
      throw new ApiError({
        status: 403,
        code: `HOSPITAL_${hospital.approvalStatus}`,
        message:
          hospital.approvalStatus === "PENDING"
            ? `${hospital.name} is still awaiting platform approval, so its workspace is not available yet.`
            : `${hospital.name} is currently ${hospital.approvalStatus.toLowerCase()} on MyHealth. Contact platform support for help.`,
      });
    }
  }
}
