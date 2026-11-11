import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/data/demoAccounts";
import { appRoutes } from "@/routes/AppRoutes";
import { demoDb, services } from "@/services";

const hospitalAccount = DEMO_ACCOUNTS.find(
  (account) => account.role === "HOSPITAL_ADMIN",
)!;

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  demoDb.reset();
});

describe("hospital data isolation", () => {
  it("lists only the departments of the requested hospital", async () => {
    const own = await services.departments.list({ hospitalId: "hsp-001" });
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((department) => department.hospitalId === "hsp-001")).toBe(true);

    const other = await services.departments.list({ hospitalId: "hsp-002" });
    expect(other.every((department) => department.hospitalId === "hsp-002")).toBe(true);
  });

  it("scopes appointments and payments to the hospital", async () => {
    const rows = await services.appointments.listDetailed({ hospitalId: "hsp-001" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.hospitalId === "hsp-001")).toBe(true);

    const payments = await services.payments.listByHospital("hsp-001");
    const appointmentIds = new Set(rows.map((row) => row.id));
    expect(
      payments.every((payment) => appointmentIds.has(payment.appointmentId)),
    ).toBe(true);
  });
});

describe("department management", () => {
  it("creates a department inside the hospital and rejects a duplicate name", async () => {
    const input = {
      hospitalId: "hsp-001",
      name: "Dermatology Unit",
      description: "Skin clinic for chronic conditions, rashes and follow-up reviews.",
      specialty: "Dermatology" as const,
      contactPhone: "+251 116 551 299",
    };

    const created = await services.departments.create(input);
    expect(created.hospitalId).toBe("hsp-001");
    expect(created.status).toBe("ACTIVE");

    await expect(services.departments.create(input)).rejects.toThrow(
      /already exists/i,
    );
  });

  it("deactivates a department without deleting its doctors", async () => {
    const before = await services.doctors.list({
      hospitalId: "hsp-001",
    });
    const assigned = before.filter((doctor) => doctor.departmentId === "dep-001");
    expect(assigned.length).toBeGreaterThan(0);

    const updated = await services.departments.setStatus("dep-001", "INACTIVE");
    expect(updated.status).toBe("INACTIVE");

    const after = await services.doctors.list({ hospitalId: "hsp-001" });
    expect(after.filter((doctor) => doctor.departmentId === "dep-001").length).toBe(
      assigned.length,
    );
  });
});

describe("doctor registration", () => {
  it("registers the doctor under the hospital with a pending invitation", async () => {
    const created = await services.doctors.create({
      hospitalId: "hsp-001",
      fullName: "Dr. Test Registrar",
      email: "test.registrar@example.com",
      specialty: "Cardiology",
      departmentId: "dep-001",
      licenseNumber: "ET-MD-99999",
      yearsExperience: 4,
      consultationFee: 450,
      bio: "Cardiology registrar focused on preventive heart care and follow-up clinics.",
    });

    expect(created.hospitalId).toBe("hsp-001");
    expect(created.accountStatus).toBe("PENDING_INVITATION");
    expect(created.isActive).not.toBe(false);

    const own = await services.doctors.list({ hospitalId: "hsp-001" });
    expect(own.some((doctor) => doctor.id === created.id)).toBe(true);

    const other = await services.doctors.list({ hospitalId: "hsp-002" });
    expect(other.some((doctor) => doctor.id === created.id)).toBe(false);
  });

  it("rejects a department that belongs to another hospital", async () => {
    await expect(
      services.doctors.create({
        hospitalId: "hsp-001",
        fullName: "Dr. Cross Hospital",
        email: "cross.hospital@example.com",
        specialty: "Pediatrics",
        departmentId: "dep-004",
        licenseNumber: "ET-MD-88888",
        yearsExperience: 6,
        consultationFee: 400,
        bio: "Attempts to attach a doctor to another hospital's department.",
      }),
    ).rejects.toThrow(/another hospital/i);
  });

  it("deactivates a doctor without cancelling their appointments", async () => {
    const before = await services.appointments.listDetailed({ doctorId: "doc-001" });
    expect(before.length).toBeGreaterThan(0);

    const deactivated = await services.doctors.setActive("doc-001", false);
    expect(deactivated.isActive).toBe(false);

    const after = await services.appointments.listDetailed({ doctorId: "doc-001" });
    expect(after.map((row) => row.status)).toEqual(before.map((row) => row.status));
  });
});

describe("hospital admin screens", () => {
  it("renders the dashboard for the assigned hospital", async () => {
    await services.auth.login({
      email: hospitalAccount.email,
      password: DEMO_PASSWORD,
    });

    renderAt("/hospital-admin");

    expect(
      await screen.findByRole("heading", { name: /addis care general hospital/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: /today's appointments/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders the department directory from the hospital", async () => {
    await services.auth.login({
      email: hospitalAccount.email,
      password: DEMO_PASSWORD,
    });

    renderAt("/hospital-admin/departments");

    expect(
      await screen.findByRole("heading", { name: /departments/i, level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Cardiology Department")).toBeInTheDocument();
  });

  it("blocks a hospital admin from the patient workspace", async () => {
    await services.auth.login({
      email: hospitalAccount.email,
      password: DEMO_PASSWORD,
    });

    renderAt("/patient");

    expect(await screen.findByText(/access restricted/i)).toBeInTheDocument();
  });
});
