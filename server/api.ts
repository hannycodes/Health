import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

import type {
  AccountStatus,
  AuditAction,
  AuditLog,
  Hospital,
  HospitalApprovalStatus,
  Notification,
  Patient,
  PlatformSettings,
  PlatformUser,
  User,
} from "../src/types";
import { createSeedDatabase, type ApiDatabase } from "./seed";

/* -------------------------------------------------------------------------- */
/*                                  Storage                                   */
/* -------------------------------------------------------------------------- */

const DATA_FILE = fileURLToPath(new URL("./data.json", import.meta.url));

function loadDb(): ApiDatabase {
  if (!existsSync(DATA_FILE)) {
    const seeded = createSeedDatabase();
    saveDb(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as ApiDatabase;
    const seed = createSeedDatabase();
    // Preserve data, but back-fill collections added by a newer release.
    return { ...seed, ...parsed };
  } catch {
    const seeded = createSeedDatabase();
    saveDb(seeded);
    return seeded;
  }
}

function saveDb(next: ApiDatabase) {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const temp = `${DATA_FILE}.tmp`;
  writeFileSync(temp, JSON.stringify(next, null, 2), "utf8");
  renameSync(temp, DATA_FILE);
}

const db: ApiDatabase = loadDb();

function persist() {
  saveDb(db);
}

/* -------------------------------------------------------------------------- */
/*                                 Sessions                                   */
/* -------------------------------------------------------------------------- */

interface Session {
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

function tokenOf(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function currentUser(req: IncomingMessage): User | null {
  const token = tokenOf(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return allUsers().find((user) => user.id === session.userId) ?? null;
}

function requireUser(req: IncomingMessage): User {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, "Your session has ended. Please sign in again.", "SESSION_EXPIRED");
  return user;
}

function requireSuperAdmin(req: IncomingMessage): User {
  const user = requireUser(req);
  if (user.role !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only Super Administrators may perform this action.");
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function allUsers(): User[] {
  return [
    ...db.patients,
    ...db.doctors,
    ...db.hospitalAdmins,
    ...db.superAdmins,
  ];
}

function hospitalOf(user: User): Hospital | undefined {
  const id = "hospitalId" in user ? (user.hospitalId as string) : undefined;
  return id ? db.hospitals.find((hospital) => hospital.id === id) : undefined;
}

function platformUser(user: User): PlatformUser {
  const hospital = hospitalOf(user);
  return {
    ...user,
    hospitalId: hospital?.id,
    hospitalName: hospital?.name,
  };
}

function toAdministrator(admin: ApiDatabase["hospitalAdmins"][number]) {
  return {
    ...admin,
    hospitalName:
      db.hospitals.find((hospital) => hospital.id === admin.hospitalId)?.name ??
      "Unassigned",
  };
}

function nowISO() {
  return new Date().toISOString();
}

function recordAudit(
  actor: User | null,
  input: {
    action: AuditAction;
    entityType: AuditLog["entityType"];
    entityId: string;
    entityLabel: string;
    description: string;
    metadata?: Record<string, string>;
  },
) {
  const entry: AuditLog = {
    id: `aud-${randomUUID()}`,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    description: input.description,
    actorId: actor?.id ?? "system",
    actorName: actor?.fullName ?? "System",
    result: "SUCCESS",
    createdAt: nowISO(),
    metadata: input.metadata,
  };
  db.auditLogs = [entry, ...db.auditLogs];
  return entry;
}

function pushNotification(input: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  const notification: Notification = {
    id: `ntf-${randomUUID()}`,
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: "APPROVAL",
    isRead: false,
    createdAt: nowISO(),
    link: input.link,
  };
  db.notifications = [notification, ...db.notifications];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function flag(value: unknown) {
  return value === true;
}

/* -------------------------------------------------------------------------- */
/*                                  Router                                    */
/* -------------------------------------------------------------------------- */

type Body = Record<string, unknown>;

async function readBody(req: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Body;
  } catch {
    return {};
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);
  const body = method === "GET" || method === "HEAD" ? {} : await readBody(req);
  const [root, second, third, fourth] = segments;

  /* ------------------------------- Auth ---------------------------------- */

  if (root === "auth") {
    if (second === "login" && method === "POST") {
      const email = text(body.email).trim().toLowerCase();
      const password = text(body.password);
      const user = allUsers().find((item) => item.email.toLowerCase() === email);
      const credential = db.credentials.find(
        (item) => item.email.toLowerCase() === email,
      );
      if (!user || !credential || credential.password !== password) {
        throw new HttpError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
      }

      const status = user.status ?? "ACTIVE";
      if (status === "PENDING") {
        throw new HttpError(403, "Your account is awaiting approval.", "ACCOUNT_PENDING");
      }
      if (status === "SUSPENDED") {
        throw new HttpError(403, "This account has been suspended.", "ACCOUNT_SUSPENDED");
      }
      if (status === "DISABLED") {
        throw new HttpError(403, "This account has been disabled.", "ACCOUNT_DISABLED");
      }
      const hospital = hospitalOf(user);
      if (hospital && hospital.approvalStatus !== "APPROVED") {
        throw new HttpError(
          403,
          `${hospital.name} is currently ${hospital.approvalStatus.toLowerCase()} on MyHealth.`,
          `HOSPITAL_${hospital.approvalStatus}`,
        );
      }

      const remember = body.remember !== false;
      const token = randomUUID();
      const ttl = (remember ? 8 * 60 : 60) * 60_000;
      sessions.set(token, { userId: user.id, expiresAt: Date.now() + ttl });

      return send(res, 200, {
        user,
        token,
        hospitalId: hospital?.id,
        expiresAt: new Date(Date.now() + ttl).toISOString(),
      });
    }

    if (second === "logout" && method === "POST") {
      const token = tokenOf(req);
      if (token) sessions.delete(token);
      return send(res, 200, {});
    }

    if (second === "me" && method === "GET") {
      return send(res, 200, requireUser(req));
    }

    if (second === "register" && method === "POST") {
      const email = text(body.email).trim().toLowerCase();
      if (!flag(body.acceptedTerms) || !flag(body.acceptedPrivacy)) {
        throw new HttpError(
          400,
          "You must accept the terms of service and the privacy notice to create an account.",
          "CONSENT_REQUIRED",
        );
      }
      if (allUsers().some((item) => item.email.toLowerCase() === email)) {
        throw new HttpError(409, "An account with this email address already exists.", "EMAIL_TAKEN");
      }
      const user: Patient = {
        id: `pat-${randomUUID().slice(0, 8)}`,
        email,
        fullName: text(body.fullName).trim(),
        role: "PATIENT",
        phone: text(body.phone).trim(),
        dateOfBirth: text(body.dateOfBirth) || undefined,
        gender: body.gender as Patient["gender"],
        age: typeof body.age === "number" ? body.age : undefined,
        weightKg: typeof body.weightKg === "number" ? body.weightKg : undefined,
        heightCm: typeof body.heightCm === "number" ? body.heightCm : undefined,
        medicalHistory: text(body.medicalHistory) || undefined,
        allergies: text(body.allergies) || undefined,
        currentMedications: text(body.currentMedications) || undefined,
        status: "ACTIVE",
        createdAt: nowISO(),
      };
      db.patients = [...db.patients, user];
      db.credentials = [
        ...db.credentials,
        { userId: user.id, email, password: text(body.password) },
      ];
      persist();
      return send(res, 201, { user, requiresVerification: false });
    }

    if (second === "forgot-password" && method === "POST") {
      const email = text(body.email).trim().toLowerCase();
      const user = allUsers().find((item) => item.email.toLowerCase() === email);
      if (user) {
        const token = randomUUID();
        const createdAt = new Date();
        db.passwordResets = [
          ...db.passwordResets,
          {
            token,
            userId: user.id,
            createdAt: createdAt.toISOString(),
            expiresAt: new Date(createdAt.getTime() + 60 * 60_000).toISOString(),
          },
        ];
        persist();
        // A production deployment sends this token by email; never in the response.
      }
      return send(res, 200, {});
    }

    if (second === "reset-password" && method === "POST") {
      const token = text(body.token);
      const reset = db.passwordResets.find((item) => item.token === token);
      if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) {
        throw new HttpError(
          400,
          "This reset link is invalid or has expired. Request a new one.",
          "RESET_TOKEN_INVALID",
        );
      }
      const credential = db.credentials.find(
        (item) => item.userId === reset.userId,
      );
      if (!credential) {
        throw new HttpError(400, "This reset link is invalid.", "RESET_TOKEN_INVALID");
      }
      credential.password = text(body.newPassword);
      db.passwordResets = db.passwordResets.filter(
        (item) => item.userId !== reset.userId,
      );
      persist();
      return send(res, 200, {});
    }
  }

  /* ---------------------------- Applications ------------------------------ */

  if (root === "applications" && method === "POST") {
    if (second !== "doctor" && second !== "hospital") {
      throw new HttpError(404, "Unknown application type.");
    }

    const application = {
      id: `app-${randomUUID().slice(0, 8)}`,
      type: second === "doctor" ? "DOCTOR" : "HOSPITAL",
      status: "PENDING",
      createdAt: nowISO(),
      ...(body as Record<string, unknown>),
    };

    db.applications = [...(db.applications ?? []), application];
    persist();
    return send(res, 201, { id: application.id, status: "PENDING" });
  }

  /* ----------------------------- Hospitals -------------------------------- */

  if (root === "hospitals") {
    if (!second && method === "GET") {
      const approvalStatus = url.searchParams.get("approvalStatus");
      const city = url.searchParams.get("city");
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const hospitals = db.hospitals.filter((hospital) => {
        if (approvalStatus && hospital.approvalStatus !== approvalStatus) return false;
        if (city && hospital.city !== city) return false;
        if (
          search &&
          !`${hospital.name} ${hospital.city}`.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      });
      return send(res, 200, hospitals);
    }

    if (second && !third) {
      const hospital = db.hospitals.find((item) => item.id === second);
      if (!hospital) throw new HttpError(404, "Hospital not found.");
      if (method === "GET") return send(res, 200, hospital);
      if (method === "PATCH") {
        requireSuperAdmin(req);
        Object.assign(hospital, body);
        persist();
        return send(res, 200, hospital);
      }
    }

    if (second && third === "approval" && method === "PATCH") {
      const actor = requireSuperAdmin(req);
      const hospital = db.hospitals.find((item) => item.id === second);
      if (!hospital) throw new HttpError(404, "Hospital not found.");

      const status = text(body.status) as HospitalApprovalStatus;
      const reason = text(body.reason).trim();
      const previous = hospital.approvalStatus;

      if (status === "REJECTED" || status === "SUSPENDED") {
        if (!reason || reason.length < 10) {
          throw new HttpError(400, "Please provide a reason of at least 10 characters.");
        }
      }

      hospital.approvalStatus = status;
      hospital.isVerified = status === "APPROVED";
      if (status === "APPROVED") {
        hospital.reviewedAt = nowISO();
        hospital.rejectionReason = undefined;
        hospital.suspensionReason = undefined;
      }
      if (status === "REJECTED") {
        hospital.reviewedAt = nowISO();
        hospital.rejectionReason = reason;
      }
      if (status === "SUSPENDED") {
        hospital.suspensionReason = reason;
      }

      const action: AuditAction =
        status === "APPROVED"
          ? body.reactivate
            ? "HOSPITAL_REACTIVATED"
            : "HOSPITAL_APPROVED"
          : status === "REJECTED"
            ? "HOSPITAL_REJECTED"
            : "HOSPITAL_SUSPENDED";

      recordAudit(actor, {
        action,
        entityType: "HOSPITAL",
        entityId: hospital.id,
        entityLabel: hospital.name,
        description: `Hospital status changed from ${previous} to ${status}.`,
        metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
      });

      const admin = db.hospitalAdmins.find(
        (item) => item.hospitalId === hospital.id,
      );
      if (admin) {
        pushNotification({
          userId: admin.id,
          title: `Hospital ${status.toLowerCase()}`,
          message: `${hospital.name} was ${status.toLowerCase()} by the platform team.`,
          link: "/hospital-admin/profile",
        });
      }
      persist();
      return send(res, 200, hospital);
    }
  }

  /* ------------------------------- Doctors -------------------------------- */

  if (root === "doctors" && method === "GET") {
    if (!second) {
      const hospitalId = url.searchParams.get("hospitalId");
      const specialty = url.searchParams.get("specialty");
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      return send(
        res,
        200,
        db.doctors.filter((doctor) => {
          if (hospitalId && doctor.hospitalId !== hospitalId) return false;
          if (specialty && doctor.specialty !== specialty) return false;
          if (
            search &&
            !`${doctor.fullName} ${doctor.specialty}`.toLowerCase().includes(search)
          ) {
            return false;
          }
          return true;
        }),
      );
    }
    if (second === "me") {
      const userId = url.searchParams.get("userId");
      return send(res, 200, db.doctors.find((doctor) => doctor.id === userId) ?? null);
    }
    const doctor = db.doctors.find((item) => item.id === second);
    return send(res, 200, doctor ?? null);
  }

  /* ------------------------------- Patients ------------------------------- */

  if (root === "patients") {
    if (!second && method === "GET") return send(res, 200, db.patients);
    if (second === "me" && method === "GET") {
      const userId = url.searchParams.get("userId");
      return send(res, 200, db.patients.find((patient) => patient.id === userId) ?? null);
    }
    const patient = db.patients.find((item) => item.id === second);
    if (!patient) throw new HttpError(404, "Patient not found.");
    if (method === "GET") return send(res, 200, patient);
    if (method === "PATCH") {
      const allowed = [
        "fullName",
        "phone",
        "address",
        "emergencyContact",
        "bloodType",
        "dateOfBirth",
        "gender",
      ] as const;
      for (const key of allowed) {
        if (key in body) {
          (patient as unknown as Record<string, unknown>)[key] = body[key];
        }
      }
      persist();
      return send(res, 200, patient);
    }
  }

  /* --------------------------- Platform admin ----------------------------- */

  if (root === "admin") {
    if (second === "users") {
      const actor = requireSuperAdmin(req);
      if (!third && method === "GET") {
        const role = url.searchParams.get("role");
        const status = url.searchParams.get("status");
        const hospitalId = url.searchParams.get("hospitalId");
        const search = url.searchParams.get("search")?.toLowerCase() ?? "";
        const users = allUsers()
          .filter((user) => {
            if (role && user.role !== role) return false;
            if (status && (user.status ?? "ACTIVE") !== status) return false;
            if (hospitalId && hospitalOf(user)?.id !== hospitalId) return false;
            if (
              search &&
              !`${user.fullName} ${user.email} ${user.id}`
                .toLowerCase()
                .includes(search)
            ) {
              return false;
            }
            return true;
          })
          .map(platformUser)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return send(res, 200, users);
      }
      if (third === "me") return send(res, 200, platformUser(actor));

      if (third && fourth === "status" && method === "PATCH") {
        const target = allUsers().find((user) => user.id === third);
        if (!target) throw new HttpError(404, "User account not found.");
        if (target.id === actor.id) {
          throw new HttpError(403, "You cannot change the status of your own account.");
        }
        if (target.role === "SUPER_ADMIN") {
          throw new HttpError(
            403,
            "Super Administrator accounts are managed through secure provisioning, not this screen.",
          );
        }
        const status = text(body.status) as AccountStatus;
        const reason = text(body.reason).trim();
        if ((status === "SUSPENDED" || status === "DISABLED") && !reason) {
          throw new HttpError(
            400,
            "A reason is required when suspending or disabling an account.",
          );
        }
        const previous = target.status ?? "ACTIVE";
        target.status = status;
        recordAudit(actor, {
          action: "USER_STATUS_CHANGED",
          entityType: "USER",
          entityId: target.id,
          entityLabel: target.fullName,
          description: `Account status changed from ${previous} to ${status}.`,
          metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
        });
        persist();
        return send(res, 200, platformUser(target));
      }

      if (third && method === "GET") {
        const target = allUsers().find((user) => user.id === third);
        if (!target) throw new HttpError(404, "User account not found.");
        return send(res, 200, platformUser(target));
      }
    }

    if (second === "administrators") {
      const actor = requireSuperAdmin(req);
      if (!third && method === "GET") {
        const status = url.searchParams.get("status");
        const hospitalId = url.searchParams.get("hospitalId");
        const search = url.searchParams.get("search")?.toLowerCase() ?? "";
        return send(
          res,
          200,
          db.hospitalAdmins
            .filter((admin) => {
              if (status && (admin.status ?? "ACTIVE") !== status) return false;
              if (hospitalId && admin.hospitalId !== hospitalId) return false;
              if (
                search &&
                !`${admin.fullName} ${admin.email} ${toAdministrator(admin).hospitalName}`
                  .toLowerCase()
                  .includes(search)
              ) {
                return false;
              }
              return true;
            })
            .map(toAdministrator)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      }

      if (third === "invite" && method === "POST") {
        const email = text(body.email).trim().toLowerCase();
        if (allUsers().some((user) => user.email.toLowerCase() === email)) {
          throw new HttpError(409, "An account with this email address already exists.");
        }
        const hospital = db.hospitals.find((item) => item.id === text(body.hospitalId));
        if (!hospital) throw new HttpError(404, "Hospital not found.");
        if (hospital.approvalStatus !== "APPROVED") {
          throw new HttpError(400, "Administrators can only be assigned to an approved hospital.");
        }
        const temporaryPassword = `Mh-${randomUUID().slice(0, 8)}`;
        const administrator = {
          id: `adm-${randomUUID().slice(0, 8)}`,
          email,
          fullName: text(body.fullName).trim(),
          role: "HOSPITAL_ADMIN" as const,
          phone: text(body.phone).trim() || undefined,
          hospitalId: hospital.id,
          status: "PENDING" as const,
          createdAt: nowISO(),
        };
        db.hospitalAdmins = [...db.hospitalAdmins, administrator];
        db.credentials = [
          ...db.credentials,
          { userId: administrator.id, email, password: temporaryPassword },
        ];
        recordAudit(actor, {
          action: "ADMINISTRATOR_INVITED",
          entityType: "USER",
          entityId: administrator.id,
          entityLabel: administrator.fullName,
          description: `Administrator invited to ${hospital.name}.`,
          metadata: { hospital: hospital.name },
        });
        persist();
        return send(res, 201, { administrator, temporaryPassword });
      }

      const admin = db.hospitalAdmins.find((item) => item.id === third);
      if (!admin) throw new HttpError(404, "Administrator not found.");

      if (fourth === "hospital" && method === "PATCH") {
        const hospital = db.hospitals.find((item) => item.id === text(body.hospitalId));
        if (!hospital) throw new HttpError(404, "Hospital not found.");
        if (hospital.approvalStatus !== "APPROVED") {
          throw new HttpError(400, "Administrators can only be assigned to an approved hospital.");
        }
        const previous = hospitalOf(admin)?.name ?? "unassigned";
        admin.hospitalId = hospital.id;
        recordAudit(actor, {
          action: "ADMINISTRATOR_REASSIGNED",
          entityType: "USER",
          entityId: admin.id,
          entityLabel: admin.fullName,
          description: `Administrator reassigned from ${previous} to ${hospital.name}.`,
        });
        persist();
        return send(res, 200, toAdministrator(admin));
      }

      if (fourth === "status" && method === "PATCH") {
        if (admin.id === actor.id) {
          throw new HttpError(403, "You cannot change the status of your own account.");
        }
        const status = text(body.status) as AccountStatus;
        const reason = text(body.reason).trim();
        if ((status === "SUSPENDED" || status === "DISABLED") && !reason) {
          throw new HttpError(400, "A reason is required when suspending or disabling an account.");
        }
        const previous = admin.status ?? "ACTIVE";
        admin.status = status;
        recordAudit(actor, {
          action: "USER_STATUS_CHANGED",
          entityType: "USER",
          entityId: admin.id,
          entityLabel: admin.fullName,
          description: `Administrator status changed from ${previous} to ${status}.`,
          metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
        });
        persist();
        return send(res, 200, toAdministrator(admin));
      }

      if (method === "GET") return send(res, 200, toAdministrator(admin));
    }

    if (second === "audit-logs" && method === "GET") {
      requireSuperAdmin(req);
      const action = url.searchParams.get("action");
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
      const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;
      const logs = db.auditLogs
        .filter((log) => {
          if (action && log.action !== action) return false;
          const created = new Date(log.createdAt).getTime();
          if (fromTime !== null && created < fromTime) return false;
          if (toTime !== null && created > toTime) return false;
          if (
            search &&
            !`${log.action} ${log.description} ${log.actorName} ${log.entityLabel}`
              .toLowerCase()
              .includes(search)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, logs);
    }

    if (second === "analytics") {
      requireSuperAdmin(req);
      if (third === "summary" && method === "GET") {
        const today = new Date().toISOString().slice(0, 10);
        const count = (status: HospitalApprovalStatus) =>
          db.hospitals.filter((hospital) => hospital.approvalStatus === status).length;
        return send(res, 200, {
          totalHospitals: db.hospitals.length,
          approvedHospitals: count("APPROVED"),
          pendingHospitals: count("PENDING"),
          rejectedHospitals: count("REJECTED"),
          suspendedHospitals: count("SUSPENDED"),
          totalUsers: allUsers().length,
          totalPatients: db.patients.length,
          totalDoctors: db.doctors.length,
          totalAdministrators: db.hospitalAdmins.length,
          totalSuperAdmins: db.superAdmins.length,
          totalAppointments: db.appointments.length,
          completedAppointments: db.appointments.filter(
            (appointment) => appointment.status === "COMPLETED",
          ).length,
          cancelledAppointments: db.appointments.filter(
            (appointment) => appointment.status === "CANCELLED",
          ).length,
          upcomingAppointments: db.appointments.filter(
            (appointment) =>
              appointment.status === "BOOKED" && appointment.date >= today,
          ).length,
        });
      }

      if (third === "growth" && method === "GET") {
        const range = url.searchParams.get("range") ?? "30d";
        const now = new Date();
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const end = url.searchParams.get("to")
          ? new Date(`${url.searchParams.get("to")}T23:59:59`)
          : now;
        const start =
          range === "custom" && url.searchParams.get("from")
            ? new Date(`${url.searchParams.get("from")}T00:00:00`)
            : new Date(end.getTime() - days * 86_400_000);

        const totalDays = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
        );
        const buckets: { start: number; end: number; label: string }[] = [];
        if (totalDays <= 10) {
          for (let index = 0; index < totalDays; index += 1) {
            const bucketStart = new Date(start.getTime() + index * 86_400_000);
            buckets.push({
              start: bucketStart.getTime(),
              end: bucketStart.getTime() + 86_400_000,
              label: new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
              }).format(bucketStart),
            });
          }
        } else if (totalDays <= 45) {
          for (let cursor = start.getTime(); cursor < end.getTime(); cursor += 7 * 86_400_000) {
            buckets.push({
              start: cursor,
              end: Math.min(cursor + 7 * 86_400_000, end.getTime()),
              label: new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
              }).format(new Date(cursor)),
            });
          }
        } else {
          const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
          while (cursor.getTime() <= end.getTime() && buckets.length < 12) {
            const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            buckets.push({
              start: cursor.getTime(),
              end: next.getTime(),
              label: new Intl.DateTimeFormat("en-GB", {
                month: "short",
                year: "2-digit",
              }).format(cursor),
            });
            cursor.setMonth(cursor.getMonth() + 1);
          }
        }

        const countIn = (items: string[]) =>
          buckets.map(
            (bucket) =>
              items.filter((iso) => {
                const time = new Date(iso).getTime();
                return time >= bucket.start && time < bucket.end;
              }).length,
          );

        const hospitals = countIn(db.hospitals.map((item) => item.createdAt));
        const approved = countIn(
          db.hospitals
            .filter((item) => item.approvalStatus === "APPROVED")
            .map((item) => item.reviewedAt ?? item.createdAt),
        );
        const patientsGrowth = countIn(db.patients.map((item) => item.createdAt));
        const doctorsGrowth = countIn(db.doctors.map((item) => item.createdAt));
        const administrators = countIn(
          db.hospitalAdmins.map((item) => item.createdAt),
        );
        const appointments = countIn(db.appointments.map((item) => item.createdAt));

        return send(
          res,
          200,
          buckets.map((bucket, index) => ({
            label: bucket.label,
            hospitals: hospitals[index],
            approvedHospitals: approved[index],
            patients: patientsGrowth[index],
            doctors: doctorsGrowth[index],
            administrators: administrators[index],
            appointments: appointments[index],
          })),
        );
      }
    }

    if (second === "settings") {
      if (method === "GET") {
        requireSuperAdmin(req);
        return send(res, 200, db.settings);
      }
      if (method === "PATCH") {
        const actor = requireSuperAdmin(req);
        db.settings = {
          ...db.settings,
          ...(body as Partial<PlatformSettings>),
          updatedAt: nowISO(),
          updatedBy: actor.fullName,
        };
        recordAudit(actor, {
          action: "SETTINGS_UPDATED",
          entityType: "SETTINGS",
          entityId: "platform",
          entityLabel: "Platform settings",
          description: "Platform configuration was updated.",
        });
        persist();
        return send(res, 200, db.settings);
      }
    }
  }

  /* ----------------------------- Notifications ---------------------------- */

  if (root === "notifications") {
    if (method === "GET" && second === "unread-count") {
      const userId = url.searchParams.get("userId");
      return send(
        res,
        200,
        db.notifications.filter(
          (item) => item.userId === userId && !item.isRead,
        ).length,
      );
    }
    if (method === "GET" && !second) {
      const userId = url.searchParams.get("userId");
      return send(
        res,
        200,
        db.notifications.filter((item) => item.userId === userId),
      );
    }
    if (method === "POST" && second === "read-all") {
      const userId = text(body.userId);
      db.notifications.forEach((item) => {
        if (item.userId === userId) item.isRead = true;
      });
      persist();
      return send(res, 200, {});
    }
    if (method === "POST" && third === "read") {
      const notification = db.notifications.find((item) => item.id === second);
      if (notification) notification.isRead = true;
      persist();
      return send(res, 200, {});
    }
  }

  throw new HttpError(404, "Not found.");
}

async function middleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) {
  try {
    // `/api/ai/*` belongs to the clinical AI gateway, which Vite proxies to
    // `npm run dev:ai`; leave those requests for the proxy.
    if (req.url?.startsWith("/ai")) {
      next();
      return;
    }
    await handle(req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      send(res, error.status, { message: error.message, code: error.code });
      return;
    }
    if (error instanceof Error && error.message.includes("Unexpected end of JSON")) {
      send(res, 400, { message: "Invalid request body." });
      return;
    }
    send(res, 500, { message: "Unexpected server error." });
    next(error);
  }
}

/**
 * Local API backend for development.
 *
 * Mounted by Vite at `/api`, persisted to `server/data.json` (gitignored).
 * Auth and the Super Admin portal use this API; patient-facing appointment
 * data still resolves through the shared mock service layer.
 */
export function apiPlugin(): Plugin {
  return {
    name: "myhealth-api",
    configureServer(server) {
      server.middlewares.use("/api", middleware);
    },
  };
}
