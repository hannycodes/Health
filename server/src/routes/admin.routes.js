import express from "express";

import { db, nextId, saveDb } from "../db.js";
import { hashPassword, publicUser, requireRole } from "../auth.js";
import { assert, getHospital, hospitalName, recordAudit } from "../helpers.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "DISABLED"];

function platformUser(user) {
  const hospital = user.hospitalId ? getHospital(user.hospitalId) : undefined;
  return {
    ...publicUser(user),
    hospitalId: hospital?.id,
    hospitalName: hospital?.name,
  };
}

function administrator(user) {
  return {
    ...publicUser(user),
    hospitalName: hospitalName(user.hospitalId) ?? "Unassigned",
  };
}

/** Suspending or disabling an account is only allowed with a written reason. */
function assertStatusChange(target, actor, status, reason) {
  assert(
    ACCOUNT_STATUSES.includes(status),
    422,
    "Status must be ACTIVE, PENDING, SUSPENDED or DISABLED.",
  );
  assert(target.id !== actor.id, 403, "You cannot change the status of your own account.");
  assert(
    target.role !== "SUPER_ADMIN",
    403,
    "Super Administrator accounts are managed through secure provisioning, not this screen.",
  );
  if (status === "SUSPENDED" || status === "DISABLED") {
    assert(reason.length >= 3, 422, "A reason is required when suspending or disabling an account.");
  }
}

export function adminRoutes(auth) {
  const router = express.Router();

  router.use(auth);
  router.use(requireRole("SUPER_ADMIN"));

  /* ---------------------------------- Users -------------------------------- */

  router.get("/admin/users", (req, res) => {
    const { role, status, hospitalId, search } = req.query;
    const term = typeof search === "string" ? search.trim().toLowerCase() : "";

    const rows = db.users
      .filter((user) => {
        if (role && user.role !== role) return false;
        if (status && (user.status ?? "ACTIVE") !== status) return false;
        if (hospitalId && user.hospitalId !== hospitalId) return false;
        if (
          term &&
          !`${user.fullName} ${user.email} ${user.id}`.toLowerCase().includes(term)
        ) {
          return false;
        }
        return true;
      })
      .map(platformUser)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json(rows);
  });

  router.get("/admin/users/:id", (req, res) => {
    const user = db.users.find((candidate) => candidate.id === req.params.id);
    assert(user, 404, "User account not found.");
    res.json(platformUser(user));
  });

  router.patch("/admin/users/:id/status", (req, res) => {
    const user = db.users.find((candidate) => candidate.id === req.params.id);
    assert(user, 404, "User account not found.");

    const status = req.body?.status;
    const reason = String(req.body?.reason ?? "").trim();
    assertStatusChange(user, req.user, status, reason);

    const previous = user.status ?? "ACTIVE";
    user.status = status;

    recordAudit(req.user, {
      action: "USER_STATUS_CHANGED",
      entityType: "USER",
      entityId: user.id,
      entityLabel: user.fullName,
      description: `Account status changed from ${previous} to ${status}.`,
      metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
    });

    saveDb();
    res.json(platformUser(user));
  });

  /* ------------------------------ Administrators --------------------------- */

  router.get("/admin/administrators", (req, res) => {
    const { status, hospitalId, search } = req.query;
    const term = typeof search === "string" ? search.trim().toLowerCase() : "";

    const rows = db.users
      .filter((user) => user.role === "HOSPITAL_ADMIN")
      .filter((admin) => {
        if (status && (admin.status ?? "ACTIVE") !== status) return false;
        if (hospitalId && admin.hospitalId !== hospitalId) return false;
        if (
          term &&
          !`${admin.fullName} ${admin.email} ${hospitalName(admin.hospitalId) ?? ""}`
            .toLowerCase()
            .includes(term)
        ) {
          return false;
        }
        return true;
      })
      .map(administrator)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json(rows);
  });

  router.post("/admin/administrators/invite", (req, res) => {
    const body = req.body ?? {};
    const email = String(body.email ?? "").trim().toLowerCase();

    assert(EMAIL_PATTERN.test(email), 422, "Enter a valid email address.");
    assert(
      String(body.fullName ?? "").trim().length >= 3,
      422,
      "Enter the administrator's full name.",
    );
    assert(
      !db.users.some((user) => user.email.toLowerCase() === email),
      409,
      "An account with this email address already exists.",
    );

    const hospital = getHospital(body.hospitalId);
    assert(hospital, 404, "Hospital not found.");
    assert(
      hospital.approvalStatus === "APPROVED",
      400,
      "Administrators can only be assigned to an approved hospital.",
    );

    const temporaryPassword = `Mh-${Math.random().toString(36).slice(2, 10)}`;
    const created = {
      id: nextId("adm"),
      email,
      fullName: String(body.fullName).trim(),
      role: "HOSPITAL_ADMIN",
      phone: body.phone ? String(body.phone).trim() : undefined,
      hospitalId: hospital.id,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(temporaryPassword),
    };

    db.users = [...db.users, created];

    recordAudit(req.user, {
      action: "ADMINISTRATOR_INVITED",
      entityType: "USER",
      entityId: created.id,
      entityLabel: created.fullName,
      description: `Administrator invited to ${hospital.name}.`,
      metadata: { hospital: hospital.name },
    });

    saveDb();
    res.status(201).json({
      administrator: publicUser(created),
      temporaryPassword,
    });
  });

  router.get("/admin/administrators/:id", (req, res) => {
    const admin = db.users.find(
      (user) => user.id === req.params.id && user.role === "HOSPITAL_ADMIN",
    );
    assert(admin, 404, "Administrator not found.");
    res.json(administrator(admin));
  });

  router.patch("/admin/administrators/:id/hospital", (req, res) => {
    const admin = db.users.find(
      (user) => user.id === req.params.id && user.role === "HOSPITAL_ADMIN",
    );
    assert(admin, 404, "Administrator not found.");

    const hospital = getHospital(req.body?.hospitalId);
    assert(hospital, 404, "Hospital not found.");
    assert(
      hospital.approvalStatus === "APPROVED",
      400,
      "Administrators can only be assigned to an approved hospital.",
    );

    const previous = hospitalName(admin.hospitalId) ?? "unassigned";
    admin.hospitalId = hospital.id;

    recordAudit(req.user, {
      action: "ADMINISTRATOR_REASSIGNED",
      entityType: "USER",
      entityId: admin.id,
      entityLabel: admin.fullName,
      description: `Administrator reassigned from ${previous} to ${hospital.name}.`,
    });

    saveDb();
    res.json(administrator(admin));
  });

  router.patch("/admin/administrators/:id/status", (req, res) => {
    const admin = db.users.find(
      (user) => user.id === req.params.id && user.role === "HOSPITAL_ADMIN",
    );
    assert(admin, 404, "Administrator not found.");

    const status = req.body?.status;
    const reason = String(req.body?.reason ?? "").trim();
    assertStatusChange(admin, req.user, status, reason);

    const previous = admin.status ?? "ACTIVE";
    admin.status = status;

    recordAudit(req.user, {
      action: "USER_STATUS_CHANGED",
      entityType: "USER",
      entityId: admin.id,
      entityLabel: admin.fullName,
      description: `Administrator status changed from ${previous} to ${status}.`,
      metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
    });

    saveDb();
    res.json(administrator(admin));
  });

  /* -------------------------------- Audit log ------------------------------ */

  router.get("/admin/audit-logs", (req, res) => {
    const { action, search, from, to } = req.query;
    const term = typeof search === "string" ? search.trim().toLowerCase() : "";
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;

    const rows = db.auditLogs
      .filter((log) => {
        if (action && log.action !== action) return false;
        const created = new Date(log.createdAt).getTime();
        if (fromTime !== null && created < fromTime) return false;
        if (toTime !== null && created > toTime) return false;
        if (
          term &&
          !`${log.action} ${log.description} ${log.actorName} ${log.entityLabel}`
            .toLowerCase()
            .includes(term)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json(rows);
  });

  /* --------------------------------- Analytics ----------------------------- */

  router.get("/admin/analytics/summary", (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const count = (status) =>
      db.hospitals.filter((hospital) => hospital.approvalStatus === status).length;

    res.json({
      totalHospitals: db.hospitals.length,
      approvedHospitals: count("APPROVED"),
      pendingHospitals: count("PENDING"),
      rejectedHospitals: count("REJECTED"),
      suspendedHospitals: count("SUSPENDED"),
      totalUsers: db.users.length,
      totalPatients: db.users.filter((user) => user.role === "PATIENT").length,
      totalDoctors: db.users.filter((user) => user.role === "DOCTOR").length,
      totalAdministrators: db.users.filter((user) => user.role === "HOSPITAL_ADMIN").length,
      totalSuperAdmins: db.users.filter((user) => user.role === "SUPER_ADMIN").length,
      totalAppointments: db.appointments.length,
      completedAppointments: db.appointments.filter((item) => item.status === "COMPLETED").length,
      cancelledAppointments: db.appointments.filter((item) => item.status === "CANCELLED").length,
      upcomingAppointments: db.appointments.filter(
        (item) => item.status === "BOOKED" && item.date >= today,
      ).length,
    });
  });

  router.get("/admin/analytics/growth", (req, res) => {
    const range = req.query.range ?? "30d";
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const end = req.query.to ? new Date(`${req.query.to}T23:59:59`) : new Date();
    const start =
      range === "custom" && req.query.from
        ? new Date(`${req.query.from}T00:00:00`)
        : new Date(end.getTime() - days * 86_400_000);

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    const buckets = [];

    if (totalDays <= 10) {
      for (let index = 0; index < totalDays; index += 1) {
        const bucketStart = new Date(start.getTime() + index * 86_400_000);
        buckets.push({
          start: bucketStart.getTime(),
          end: bucketStart.getTime() + 86_400_000,
          label: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(
            bucketStart,
          ),
        });
      }
    } else if (totalDays <= 45) {
      for (let cursor = start.getTime(); cursor < end.getTime(); cursor += 7 * 86_400_000) {
        buckets.push({
          start: cursor,
          end: Math.min(cursor + 7 * 86_400_000, end.getTime()),
          label: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(
            new Date(cursor),
          ),
        });
      }
    } else {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor.getTime() <= end.getTime() && buckets.length < 12) {
        const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        buckets.push({
          start: cursor.getTime(),
          end: next.getTime(),
          label: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(
            cursor,
          ),
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const countIn = (items) =>
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
    const patients = countIn(
      db.users.filter((user) => user.role === "PATIENT").map((user) => user.createdAt),
    );
    const doctors = countIn(
      db.users.filter((user) => user.role === "DOCTOR").map((user) => user.createdAt),
    );
    const administrators = countIn(
      db.users.filter((user) => user.role === "HOSPITAL_ADMIN").map((user) => user.createdAt),
    );
    const appointments = countIn(db.appointments.map((item) => item.createdAt));

    res.json(
      buckets.map((bucket, index) => ({
        label: bucket.label,
        hospitals: hospitals[index],
        approvedHospitals: approved[index],
        patients: patients[index],
        doctors: doctors[index],
        administrators: administrators[index],
        appointments: appointments[index],
      })),
    );
  });

  /* --------------------------------- Settings ------------------------------ */

  router.get("/admin/settings", (_req, res) => res.json(db.settings));

  router.patch("/admin/settings", (req, res) => {
    db.settings = {
      ...db.settings,
      ...(req.body ?? {}),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.fullName,
    };

    recordAudit(req.user, {
      action: "SETTINGS_UPDATED",
      entityType: "SETTINGS",
      entityId: "platform",
      entityLabel: "Platform settings",
      description: "Platform configuration was updated.",
    });

    saveDb();
    res.json(db.settings);
  });

  return router;
}
