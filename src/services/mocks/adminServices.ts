import { ApiError } from "@/lib/http";
import { readSession } from "@/lib/session";
import type {
  AccountStatus,
  AdministratorInvitation,
  AnalyticsFilter,
  AuditLog,
  AuditLogFilter,
  GrowthPoint,
  Hospital,
  HospitalAdmin,
  HospitalAdminWithHospital,
  InvitationResult,
  PlatformSettings,
  PlatformSummary,
  PlatformUser,
  PlatformUserFilter,
  User,
} from "@/types";
import type { DemoDatabase } from "@/data/database";
import type {
  AdminService,
  AdministratorFilter,
  AnalyticsService,
  AuditLogService,
  SettingsService,
  UserService,
} from "@/services/interfaces";
import { todayISO } from "@/utils/format";
import { recordAudit } from "./audit";
import { demoDb } from "./store";
import { createId, respond } from "./utils";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

type UserCollection = "patients" | "doctors" | "hospitalAdmins" | "superAdmins";

const USER_COLLECTIONS: UserCollection[] = [
  "patients",
  "doctors",
  "hospitalAdmins",
  "superAdmins",
];

function allUsers(db: DemoDatabase): User[] {
  return [
    ...db.patients,
    ...db.doctors,
    ...db.hospitalAdmins,
    ...db.superAdmins,
  ];
}

function hospitalIdOf(user: User): string | undefined {
  return "hospitalId" in user
    ? (user as { hospitalId?: string }).hospitalId
    : undefined;
}

function hospitalNameOf(db: DemoDatabase, hospitalId?: string): string | undefined {
  if (!hospitalId) return undefined;
  return db.hospitals.find((hospital) => hospital.id === hospitalId)?.name;
}

function toPlatformUser(db: DemoDatabase, user: User): PlatformUser {
  const hospitalId = hospitalIdOf(user);
  return { ...user, hospitalId, hospitalName: hospitalNameOf(db, hospitalId) };
}

function toAdministrator(
  db: DemoDatabase,
  admin: HospitalAdmin,
): HospitalAdminWithHospital {
  return {
    ...admin,
    hospitalName: hospitalNameOf(db, admin.hospitalId) ?? "Unassigned",
  };
}

function findUserEntry(
  db: DemoDatabase,
  userId: string,
): { collection: UserCollection; user: User } | null {
  for (const collection of USER_COLLECTIONS) {
    const user = (db[collection] as User[]).find((item) => item.id === userId);
    if (user) return { collection, user };
  }
  return null;
}

/** MOCK BACKEND: only a signed-in Super Admin may mutate platform state. */
function requireSuperAdmin(): User {
  const session = readSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new ApiError({
      status: 403,
      message: "Only Super Administrators may perform this action.",
    });
  }
  return session.user;
}

function nowISO() {
  return new Date().toISOString();
}

function assertStatusChangeAllowed(actor: User, target: User) {
  if (actor.id === target.id) {
    throw new ApiError({
      status: 403,
      message: "You cannot change the status of your own account.",
    });
  }
  if (target.role === "SUPER_ADMIN") {
    throw new ApiError({
      status: 403,
      message:
        "Super Administrator accounts are managed through secure provisioning, not this screen.",
    });
  }
}

function reasonForStatus(status: AccountStatus, reason?: string): string | undefined {
  if (status === "SUSPENDED" || status === "DISABLED") {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new ApiError({
        status: 400,
        message: "A reason is required when suspending or disabling an account.",
      });
    }
    return trimmed;
  }
  return reason?.trim() || undefined;
}

/* -------------------------------------------------------------------------- */
/*                              Platform users                                */
/* -------------------------------------------------------------------------- */

export class MockUserService implements UserService {
  list(filter?: PlatformUserFilter): Promise<PlatformUser[]> {
    return respond(() => {
      const db = demoDb.get();
      const search = filter?.search?.trim().toLowerCase();

      return allUsers(db)
        .map((user) => toPlatformUser(db, user))
        .filter((user) => {
          if (filter?.role && user.role !== filter.role) return false;
          if (filter?.status && (user.status ?? "ACTIVE") !== filter.status) {
            return false;
          }
          if (filter?.hospitalId && user.hospitalId !== filter.hospitalId) {
            return false;
          }
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
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  getById(id: string): Promise<PlatformUser | null> {
    return respond(() => {
      const db = demoDb.get();
      const user = allUsers(db).find((candidate) => candidate.id === id);
      return user ? toPlatformUser(db, user) : null;
    });
  }

  setStatus(
    id: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<PlatformUser> {
    return respond(() => {
      const actor = requireSuperAdmin();
      const trimmedReason = reasonForStatus(status, reason);
      let result: PlatformUser | undefined;

      demoDb.mutate((db) => {
        const entry = findUserEntry(db, id);
        if (!entry) {
          throw new ApiError({ status: 404, message: "User account not found." });
        }
        assertStatusChangeAllowed(actor, entry.user);

        const previous = entry.user.status ?? "ACTIVE";
        entry.user.status = status;
        result = toPlatformUser(db, entry.user);

        recordAudit(db, {
          action: "USER_STATUS_CHANGED",
          entityType: "USER",
          entityId: entry.user.id,
          entityLabel: entry.user.fullName,
          description: `Account status changed from ${previous} to ${status}.`,
          metadata: {
            from: previous,
            to: status,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
          },
        });
      });

      return result as PlatformUser;
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                         Hospital administrators                            */
/* -------------------------------------------------------------------------- */

export class MockAdminService implements AdminService {
  list(filter?: AdministratorFilter): Promise<HospitalAdminWithHospital[]> {
    return respond(() => {
      const db = demoDb.get();
      const search = filter?.search?.trim().toLowerCase();

      return db.hospitalAdmins
        .map((admin) => toAdministrator(db, admin))
        .filter((admin) => {
          if (filter?.status && (admin.status ?? "ACTIVE") !== filter.status) {
            return false;
          }
          if (filter?.hospitalId && admin.hospitalId !== filter.hospitalId) {
            return false;
          }
          if (
            search &&
            !`${admin.fullName} ${admin.email} ${admin.hospitalName}`
              .toLowerCase()
              .includes(search)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  getById(id: string): Promise<HospitalAdminWithHospital | null> {
    return respond(() => {
      const db = demoDb.get();
      const admin = db.hospitalAdmins.find((item) => item.id === id);
      return admin ? toAdministrator(db, admin) : null;
    });
  }

  invite(input: AdministratorInvitation): Promise<InvitationResult> {
    return respond(() => {
      const actor = requireSuperAdmin();
      const email = input.email.trim().toLowerCase();
      const fullName = input.fullName.trim();

      if (!fullName || !email) {
        throw new ApiError({
          status: 400,
          message: "Name and email address are required.",
        });
      }

      let result: InvitationResult | undefined;

      demoDb.mutate((db) => {
        if (
          allUsers(db).some((user) => user.email.toLowerCase() === email) ||
          db.credentials.some((item) => item.email.toLowerCase() === email)
        ) {
          throw new ApiError({
            status: 409,
            message: "An account with this email address already exists.",
          });
        }

        const hospital = db.hospitals.find(
          (item) => item.id === input.hospitalId,
        );
        if (!hospital) {
          throw new ApiError({ status: 404, message: "Hospital not found." });
        }
        if (hospital.approvalStatus !== "APPROVED") {
          throw new ApiError({
            status: 400,
            message:
              "Administrators can only be assigned to an approved hospital.",
          });
        }

        const temporaryPassword = `Mh-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

        const administrator: HospitalAdmin = {
          id: createId("adm"),
          email,
          fullName,
          role: "HOSPITAL_ADMIN",
          phone: input.phone?.trim() || undefined,
          hospitalId: hospital.id,
          status: "PENDING",
          createdAt: nowISO(),
        };

        db.hospitalAdmins = [...db.hospitalAdmins, administrator];
        db.credentials = [
          ...db.credentials,
          {
            userId: administrator.id,
            email,
            password: temporaryPassword,
          },
        ];

        recordAudit(db, {
          action: "ADMINISTRATOR_INVITED",
          entityType: "USER",
          entityId: administrator.id,
          entityLabel: administrator.fullName,
          description: `Administrator invited to ${hospital.name}.`,
          metadata: { hospital: hospital.name, invitedBy: actor.fullName },
        });

        result = { administrator: { ...administrator }, temporaryPassword };
      });

      return result as InvitationResult;
    });
  }

  reassign(
    id: string,
    hospitalId: string,
  ): Promise<HospitalAdminWithHospital> {
    return respond(() => {
      requireSuperAdmin();
      let result: HospitalAdminWithHospital | undefined;

      demoDb.mutate((db) => {
        const admin = db.hospitalAdmins.find((item) => item.id === id);
        if (!admin) {
          throw new ApiError({
            status: 404,
            message: "Administrator not found.",
          });
        }

        const hospital = db.hospitals.find((item) => item.id === hospitalId);
        if (!hospital) {
          throw new ApiError({ status: 404, message: "Hospital not found." });
        }
        if (hospital.approvalStatus !== "APPROVED") {
          throw new ApiError({
            status: 400,
            message:
              "Administrators can only be assigned to an approved hospital.",
          });
        }

        const previous = db.hospitals.find((item) => item.id === admin.hospitalId);
        admin.hospitalId = hospital.id;
        result = toAdministrator(db, admin);

        recordAudit(db, {
          action: "ADMINISTRATOR_REASSIGNED",
          entityType: "USER",
          entityId: admin.id,
          entityLabel: admin.fullName,
          description: `Administrator reassigned from ${previous?.name ?? "unassigned"} to ${hospital.name}.`,
          metadata: { hospital: hospital.name },
        });
      });

      return result as HospitalAdminWithHospital;
    });
  }

  setStatus(
    id: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<HospitalAdminWithHospital> {
    return respond(() => {
      const actor = requireSuperAdmin();
      const trimmedReason = reasonForStatus(status, reason);
      let result: HospitalAdminWithHospital | undefined;

      demoDb.mutate((db) => {
        const admin = db.hospitalAdmins.find((item) => item.id === id);
        if (!admin) {
          throw new ApiError({
            status: 404,
            message: "Administrator not found.",
          });
        }
        assertStatusChangeAllowed(actor, admin);

        const previous = admin.status ?? "ACTIVE";
        admin.status = status;
        result = toAdministrator(db, admin);

        recordAudit(db, {
          action: "USER_STATUS_CHANGED",
          entityType: "USER",
          entityId: admin.id,
          entityLabel: admin.fullName,
          description: `Administrator status changed from ${previous} to ${status}.`,
          metadata: {
            from: previous,
            to: status,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
          },
        });
      });

      return result as HospitalAdminWithHospital;
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                                Audit logs                                  */
/* -------------------------------------------------------------------------- */

export class MockAuditLogService implements AuditLogService {
  list(filter?: AuditLogFilter): Promise<AuditLog[]> {
    return respond(() => {
      const search = filter?.search?.trim().toLowerCase();
      const from = filter?.from ? new Date(`${filter.from}T00:00:00`).getTime() : null;
      const to = filter?.to ? new Date(`${filter.to}T23:59:59`).getTime() : null;

      return demoDb
        .get()
        .auditLogs.filter((log) => {
          if (filter?.action && log.action !== filter.action) return false;

          const created = new Date(log.createdAt).getTime();
          if (from !== null && created < from) return false;
          if (to !== null && created > to) return false;

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
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((log) => ({ ...log }));
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Analytics                                  */
/* -------------------------------------------------------------------------- */

interface Bucket {
  start: number;
  end: number;
  label: string;
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function bucketLabel(start: Date, mode: "day" | "week" | "month") {
  if (mode === "month") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "2-digit",
    }).format(start);
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(start);
}

function buildBuckets(filter: AnalyticsFilter): Bucket[] {
  const now = new Date();
  const end =
    filter.range === "custom" && filter.to
      ? new Date(`${filter.to}T23:59:59`)
      : now;
  const days =
    filter.range === "7d" ? 7 : filter.range === "30d" ? 30 : 90;
  const start =
    filter.range === "custom" && filter.from
      ? startOfDay(new Date(`${filter.from}T00:00:00`))
      : startOfDay(new Date(end.getTime() - days * DAY_MS));

  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / DAY_MS),
  );
  const buckets: Bucket[] = [];

  if (totalDays <= 10) {
    for (let index = 0; index < totalDays; index += 1) {
      const bucketStart = new Date(start.getTime() + index * DAY_MS);
      buckets.push({
        start: bucketStart.getTime(),
        end: bucketStart.getTime() + DAY_MS,
        label: bucketLabel(bucketStart, "day"),
      });
    }
    return buckets;
  }

  if (totalDays <= 45) {
    const step = 7 * DAY_MS;
    for (let cursor = start.getTime(); cursor < end.getTime(); cursor += step) {
      const bucketStart = new Date(cursor);
      buckets.push({
        start: cursor,
        end: Math.min(cursor + step, end.getTime()),
        label: bucketLabel(bucketStart, "week"),
      });
    }
    return buckets;
  }

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor.getTime() <= end.getTime() && buckets.length < 12) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    buckets.push({
      start: cursor.getTime(),
      end: next.getTime(),
      label: bucketLabel(cursor, "month"),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

function inBuckets(items: string[], buckets: Bucket[]): number[] {
  return buckets.map((bucket) =>
    items.filter((iso) => {
      const time = new Date(iso).getTime();
      return time >= bucket.start && time < bucket.end;
    }).length,
  );
}

export class MockAnalyticsService implements AnalyticsService {
  getSummary(): Promise<PlatformSummary> {
    return respond(() => {
      const db = demoDb.get();
      const today = todayISO();

      const hospitalCount = (status: Hospital["approvalStatus"]) =>
        db.hospitals.filter((hospital) => hospital.approvalStatus === status)
          .length;

      return {
        totalHospitals: db.hospitals.length,
        approvedHospitals: hospitalCount("APPROVED"),
        pendingHospitals: hospitalCount("PENDING"),
        rejectedHospitals: hospitalCount("REJECTED"),
        suspendedHospitals: hospitalCount("SUSPENDED"),
        totalUsers: allUsers(db).length,
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
      };
    });
  }

  getGrowth(filter: AnalyticsFilter): Promise<GrowthPoint[]> {
    return respond(() => {
      const db = demoDb.get();
      const buckets = buildBuckets(filter);

      const hospitalCreated = inBuckets(
        db.hospitals.map((hospital) => hospital.createdAt),
        buckets,
      );
      const hospitalApproved = inBuckets(
        db.hospitals
          .filter((hospital) => hospital.approvalStatus === "APPROVED")
          .map((hospital) => hospital.reviewedAt ?? hospital.createdAt),
        buckets,
      );
      const patients = inBuckets(
        db.patients.map((patient) => patient.createdAt),
        buckets,
      );
      const doctors = inBuckets(
        db.doctors.map((doctor) => doctor.createdAt),
        buckets,
      );
      const administrators = inBuckets(
        db.hospitalAdmins.map((admin) => admin.createdAt),
        buckets,
      );
      const appointments = inBuckets(
        db.appointments.map((appointment) => appointment.createdAt),
        buckets,
      );

      return buckets.map((bucket, index) => ({
        label: bucket.label,
        hospitals: hospitalCreated[index],
        approvedHospitals: hospitalApproved[index],
        patients: patients[index],
        doctors: doctors[index],
        administrators: administrators[index],
        appointments: appointments[index],
      }));
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                              Platform settings                             */
/* -------------------------------------------------------------------------- */

function cloneSettings(settings: PlatformSettings): PlatformSettings {
  return {
    ...settings,
    regions: [...settings.regions],
    hospitalTypes: [...settings.hospitalTypes],
    specialties: [...settings.specialties],
  };
}

export class MockSettingsService implements SettingsService {
  get(): Promise<PlatformSettings> {
    return respond(() => cloneSettings(demoDb.get().settings));
  }

  update(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return respond(() => {
      requireSuperAdmin();
      let result: PlatformSettings | undefined;

      demoDb.mutate((db) => {
        db.settings = {
          ...db.settings,
          ...patch,
          regions: patch.regions
            ? [...patch.regions]
            : [...db.settings.regions],
          hospitalTypes: patch.hospitalTypes
            ? [...patch.hospitalTypes]
            : [...db.settings.hospitalTypes],
          specialties: patch.specialties
            ? [...patch.specialties]
            : [...db.settings.specialties],
          updatedAt: nowISO(),
          updatedBy: readSession()?.user.fullName ?? "Super Admin",
        };
        result = cloneSettings(db.settings);

        recordAudit(db, {
          action: "SETTINGS_UPDATED",
          entityType: "SETTINGS",
          entityId: "platform",
          entityLabel: "Platform settings",
          description: "Platform configuration was updated.",
          metadata: { fields: Object.keys(patch).join(", ") },
        });
      });

      return result as PlatformSettings;
    });
  }
}
