import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/data/demoAccounts";
import { demoDb, services } from "@/services";
import { appRoutes } from "@/routes/AppRoutes";
import { ROLE_HOME } from "@/constants";
import { daysFromNowISO } from "@/utils/format";

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

const patientAccount = DEMO_ACCOUNTS.find((account) => account.role === "PATIENT")!;
const doctorAccount = DEMO_ACCOUNTS.find((account) => account.role === "DOCTOR")!;

beforeEach(() => {
  window.localStorage.clear();
  demoDb.reset();
});

describe("application shell", () => {
  it("renders the login page", async () => {
    renderAt("/login");
    expect(
      await screen.findByText(/sign in to myhealth/i),
    ).toBeInTheDocument();
  });

  it("renders the not-found page for unknown routes", async () => {
    renderAt("/this-route-does-not-exist");
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });
});

describe("authentication", () => {
  it("signs in a demo patient and exposes the session", async () => {
    const session = await services.auth.login({
      email: patientAccount.email,
      password: DEMO_PASSWORD,
    });

    expect(session.user.role).toBe("PATIENT");
    expect(services.auth.getSession()?.user.id).toBe(session.user.id);
  });

  it("rejects invalid credentials", async () => {
    await expect(
      services.auth.login({ email: patientAccount.email, password: "wrong-password" }),
    ).rejects.toThrow(/invalid email or password/i);
  });

  it("redirects an anonymous visitor from a protected dashboard to login", async () => {
    renderAt("/patient");
    expect(
      await screen.findByText(/sign in to myhealth/i),
    ).toBeInTheDocument();
  });

  it("blocks a patient from opening the doctor dashboard", async () => {
    await services.auth.login({
      email: patientAccount.email,
      password: DEMO_PASSWORD,
    });

    renderAt("/doctor");
    expect(await screen.findByText(/access restricted/i)).toBeInTheDocument();
  });

  it("lets a doctor reach the doctor workspace", async () => {
    await services.auth.login({
      email: doctorAccount.email,
      password: DEMO_PASSWORD,
    });

    renderAt(ROLE_HOME.DOCTOR);
    expect(
      await screen.findByRole(
        "heading",
        { name: /good (morning|afternoon|evening)/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});

describe("mock services", () => {
  it("returns the seeded hospitals and doctors", async () => {
    const hospitals = await services.hospitals.list();
    const doctors = await services.doctors.list();

    expect(hospitals.length).toBeGreaterThanOrEqual(3);
    expect(doctors.length).toBeGreaterThanOrEqual(8);
  });

  it("enriches appointments with names and payment status", async () => {
    const rows = await services.appointments.listDetailed({ patientId: "pat-001" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].doctorName).toMatch(/Dr\./);
    expect(rows[0].hospitalName.length).toBeGreaterThan(0);
  });
});

describe("shared appointment service", () => {
  it("makes a patient booking visible to the doctor and hospital admin", async () => {
    const created = await services.appointments.create({
      patientId: "pat-001",
      doctorId: "doc-002",
      hospitalId: "hsp-001",
      date: daysFromNowISO(10),
      startTime: "13:00",
      endTime: "13:30",
      reason: "Persistent cough and low-grade fever for one week.",
      paymentMethod: "PAY_AT_HOSPITAL",
    });

    const asPatient = await services.appointments.listDetailed({ patientId: "pat-001" });
    const asDoctor = await services.appointments.listDetailed({ doctorId: "doc-002" });
    const asHospital = await services.appointments.listDetailed({ hospitalId: "hsp-001" });

    for (const rows of [asPatient, asDoctor, asHospital]) {
      expect(rows.some((row) => row.id === created.id)).toBe(true);
    }

    // Pay-at-hospital bookings start unpaid and are visible to the hospital.
    const payment = await services.payments.getByAppointment(created.id);
    expect(payment?.status).toBe("UNPAID_AT_HOSPITAL");
  });

  it("keeps payment status independent from appointment status", async () => {
    const before = await services.payments.getByAppointment("apt-001");
    expect(before?.status).toBe("PAID");

    const completed = await services.appointments.complete("apt-001");
    expect(completed.status).toBe("COMPLETED");

    const after = await services.payments.getByAppointment("apt-001");
    expect(after?.status).toBe("PAID");

    const cancelled = await services.appointments.cancel("apt-002");
    expect(cancelled.status).toBe("CANCELLED");

    const unpaid = await services.payments.getByAppointment("apt-002");
    expect(unpaid?.status).toBe("UNPAID_AT_HOSPITAL");
  });

  it("rejects a double-booked doctor slot", async () => {
    await expect(
      services.appointments.create({
        patientId: "pat-004",
        doctorId: "doc-001",
        hospitalId: "hsp-001",
        date: daysFromNowISO(2),
        startTime: "09:00",
        endTime: "09:30",
        reason: "Trying to book an already taken slot.",
        paymentMethod: "ONLINE",
      }),
    ).rejects.toThrow(/already booked/i);
  });
});
