import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/data/demoAccounts";
import { appRoutes } from "@/routes/AppRoutes";
import { demoDb, services } from "@/services";

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

const superAdmin = DEMO_ACCOUNTS.find((account) => account.role === "SUPER_ADMIN")!;
const patient = DEMO_ACCOUNTS.find((account) => account.role === "PATIENT")!;

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  demoDb.reset();
  await services.auth.login({
    email: superAdmin.email,
    password: DEMO_PASSWORD,
  });
});

describe("platform dashboard", () => {
  it("renders platform-wide totals for the signed-in Super Admin", async () => {
    renderAt("/admin/dashboard");

    expect(
      await screen.findByRole("heading", { name: /welcome back, super admin/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/total hospitals/i)).toBeInTheDocument();
    expect(
      (await screen.findAllByText(/pending approvals/i)).length,
    ).toBeGreaterThan(0);
  });

  it("blocks a patient from the Super Admin portal", async () => {
    await services.auth.logout();
    await services.auth.login({ email: patient.email, password: DEMO_PASSWORD });

    renderAt("/admin/dashboard");
    expect(await screen.findByText(/access restricted/i)).toBeInTheDocument();
  });
});

describe("hospital approval workflow", () => {
  it("approves a pending hospital, records an audit entry and notifies its admin", async () => {
    const approved = await services.hospitals.approve("hsp-004");
    expect(approved.approvalStatus).toBe("APPROVED");
    expect(approved.isVerified).toBe(true);

    const logs = await services.auditLogs.list({ action: "HOSPITAL_APPROVED" });
    expect(logs[0]?.entityId).toBe("hsp-004");
    expect(logs[0]?.actorName).toBe("Super Admin");

    const notifications = await services.notifications.listForUser("adm-003");
    expect(notifications.some((item) => item.title.includes("approved"))).toBe(true);

    const pending = await services.hospitals.listPendingApprovals();
    expect(pending.some((hospital) => hospital.id === "hsp-004")).toBe(false);
  });

  it("requires a reason to reject and keeps the application", async () => {
    await expect(services.hospitals.reject("hsp-004", "short")).rejects.toThrow(
      /at least 10|reason/i,
    );

    const rejected = await services.hospitals.reject(
      "hsp-004",
      "The submitted operating licence has expired.",
    );
    expect(rejected.approvalStatus).toBe("REJECTED");
    expect(rejected.rejectionReason).toContain("expired");
    expect(await services.hospitals.getById("hsp-004")).not.toBeNull();
  });

  it("suspends and reactivates a hospital without deleting records", async () => {
    const suspended = await services.hospitals.suspend(
      "hsp-001",
      "Temporary suspension during an infection-control review.",
    );
    expect(suspended.approvalStatus).toBe("SUSPENDED");
    expect(suspended.isVerified).toBe(false);

    const appointments = await services.appointments.list({ hospitalId: "hsp-001" });
    expect(appointments.length).toBeGreaterThan(0);

    const reactivated = await services.hospitals.reactivate("hsp-001");
    expect(reactivated.approvalStatus).toBe("APPROVED");
    expect(reactivated.isVerified).toBe(true);
  });

  it("confirms approval in the review interface", async () => {
    const user = userEvent.setup();
    renderAt("/admin/hospitals/pending");

    expect(await screen.findByText("Mekelle Hope Hospital")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    expect(
      await screen.findByRole("heading", { name: /approve this hospital/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /approve hospital/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(/no applications waiting/i),
        ).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });
});

describe("platform user management", () => {
  it("filters users by role and status", async () => {
    const doctors = await services.users.list({ role: "DOCTOR" });
    expect(doctors.length).toBe(8);
    expect(doctors.every((account) => account.role === "DOCTOR")).toBe(true);

    const suspended = await services.users.list({ status: "SUSPENDED" });
    expect(suspended.some((account) => account.id === "pat-005")).toBe(true);
  });

  it("reactivates a suspended patient and audits the change", async () => {
    const updated = await services.users.setStatus("pat-005", "ACTIVE");
    expect(updated.status).toBe("ACTIVE");

    const logs = await services.auditLogs.list({ action: "USER_STATUS_CHANGED" });
    expect(logs[0]?.entityId).toBe("pat-005");
  });

  it("requires a reason for suspension", async () => {
    await expect(
      services.users.setStatus("pat-002", "SUSPENDED"),
    ).rejects.toThrow(/reason is required/i);
  });

  it("refuses to change the Super Admin's own account", async () => {
    await expect(
      services.users.setStatus("adm-000", "SUSPENDED", "Attempting self-lockout."),
    ).rejects.toThrow(/own account/i);
  });
});

describe("administrators", () => {
  it("only invites administrators to approved hospitals", async () => {
    await expect(
      services.administrators.invite({
        fullName: "Pending Hospital Admin",
        email: "pending.admin@example.com",
        hospitalId: "hsp-004",
      }),
    ).rejects.toThrow(/approved hospital/i);

    const result = await services.administrators.invite({
      fullName: "New Administrator",
      email: "new.admin@myhealth.et",
      hospitalId: "hsp-001",
    });
    expect(result.administrator.status).toBe("PENDING");
    expect(result.administrator.hospitalId).toBe("hsp-001");
    expect(result.temporaryPassword).toBeTruthy();
  });
});

describe("analytics, audit and notifications", () => {
  it("reports platform totals consistent with the dataset", async () => {
    const summary = await services.analytics.getSummary();
    const db = demoDb.get();

    expect(summary.totalHospitals).toBe(db.hospitals.length);
    expect(summary.totalUsers).toBe(
      db.patients.length +
        db.doctors.length +
        db.hospitalAdmins.length +
        db.superAdmins.length,
    );
    expect(summary.pendingHospitals).toBe(1);
    expect(summary.suspendedHospitals).toBe(1);
    expect(summary.totalAppointments).toBe(db.appointments.length);
  });

  it("returns growth buckets for each supported range", async () => {
    const growth = await services.analytics.getGrowth({ range: "90d" });
    expect(growth.length).toBeGreaterThan(0);
    expect(growth[0]).toHaveProperty("hospitals");
    expect(growth[0]).toHaveProperty("patients");
  });

  it("shows audit records read-only with no edit or delete controls", async () => {
    renderAt("/admin/activity");

    expect(
      await screen.findByRole("heading", { name: /activity and audit logs/i }),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText(/hospital approved/i)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /edit|delete/i }),
    ).not.toBeInTheDocument();
  });

  it("marks all platform notifications as read", async () => {
    const before = await services.notifications.unreadCount("adm-000");
    expect(before).toBeGreaterThan(0);

    await services.notifications.markAllRead("adm-000");
    expect(await services.notifications.unreadCount("adm-000")).toBe(0);
  });
});

describe("platform settings", () => {
  it("persists settings and records the change", async () => {
    const updated = await services.settings.update({
      platformName: "MyHealth Platform",
    });
    expect(updated.platformName).toBe("MyHealth Platform");

    const settings = await services.settings.get();
    expect(settings.platformName).toBe("MyHealth Platform");

    const logs = await services.auditLogs.list({ action: "SETTINGS_UPDATED" });
    expect(logs[0]?.action).toBe("SETTINGS_UPDATED");
  });
});
