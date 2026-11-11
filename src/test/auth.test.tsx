import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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

const patientAccount = DEMO_ACCOUNTS.find((account) => account.role === "PATIENT")!;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  demoDb.reset();
});

describe("login form", () => {
  it("shows validation errors for an empty submission", async () => {
    const user = userEvent.setup();
    renderAt("/login");

    await user.click(
      await screen.findByRole("button", { name: /^sign in$/i }),
    );

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it("rejects invalid credentials through the shared service", async () => {
    const user = userEvent.setup();
    renderAt("/login");

    await user.type(await screen.findByLabelText("Email"), patientAccount.email);
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
  });

  it("signs a patient in and redirects to the patient portal", async () => {
    const user = userEvent.setup();
    renderAt("/login");

    await user.type(await screen.findByLabelText("Email"), patientAccount.email);
    await user.type(screen.getByLabelText("Password"), DEMO_PASSWORD);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByRole("heading", { name: /welcome back, abebe/i }),
    ).toBeInTheDocument();
  });
});

describe("patient registration", () => {
  it("requires the password confirmation to match", async () => {
    const user = userEvent.setup();
    renderAt("/register");

    await user.type(await screen.findByLabelText("Full name"), "Test Patient");
    await user.type(screen.getByLabelText("Email"), "test.patient@example.com");
    await user.type(screen.getByLabelText("Phone number"), "+251 911 000 111");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Confirm password"), "different123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("enforces both consent checkboxes", async () => {
    const user = userEvent.setup();
    renderAt("/register");

    await user.type(await screen.findByLabelText("Full name"), "Test Patient");
    await user.type(screen.getByLabelText("Email"), "test.patient@example.com");
    await user.type(screen.getByLabelText("Phone number"), "+251 911 000 111");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Confirm password"), "secret123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/must accept the terms of service/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/must acknowledge the privacy notice/i),
    ).toBeInTheDocument();
  });

  it("creates an account that can sign in immediately", async () => {
    const email = "new.patient@example.com";

    const registration = await services.auth.registerPatient({
      fullName: "New Patient",
      email,
      phone: "+251 911 222 333",
      password: "secret123",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(registration.user.role).toBe("PATIENT");
    expect(registration.user.email).toBe(email);

    const session = await services.auth.login({ email, password: "secret123" });
    expect(session.user.id).toBe(registration.user.id);
    expect(services.auth.getSession()?.user.id).toBe(registration.user.id);
  });

  it("refuses a duplicate email address", async () => {
    await expect(
      services.auth.registerPatient({
        fullName: "Duplicate",
        email: patientAccount.email,
        phone: "+251 911 222 333",
        password: "secret123",
        acceptedTerms: true,
        acceptedPrivacy: true,
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("refuses registration without consent", async () => {
    await expect(
      services.auth.registerPatient({
        fullName: "No Consent",
        email: "no.consent@example.com",
        phone: "+251 911 222 333",
        password: "secret123",
        acceptedTerms: false,
        acceptedPrivacy: false,
      }),
    ).rejects.toThrow(/terms of service and the privacy notice/i);
  });
});

describe("password recovery", () => {
  it("never reveals whether an address exists", async () => {
    const unknown = await services.auth.forgotPassword("nobody@example.com");
    expect(unknown.devResetToken).toBeUndefined();
  });

  it("resets the password with the issued token and invalidates it", async () => {
    const issued = await services.auth.forgotPassword(patientAccount.email);
    expect(issued.devResetToken).toBeTruthy();

    await services.auth.resetPassword(issued.devResetToken!, "brandnew123");
    const session = await services.auth.login({
      email: patientAccount.email,
      password: "brandnew123",
    });
    expect(session.user.role).toBe("PATIENT");

    await expect(
      services.auth.resetPassword(issued.devResetToken!, "another123"),
    ).rejects.toThrow(/invalid or has expired/i);
  });

  it("rejects a reset token that was never issued", async () => {
    await expect(
      services.auth.resetPassword("not-a-token", "brandnew123"),
    ).rejects.toThrow(/invalid or has expired/i);
  });
});

describe("account state and sessions", () => {
  it("blocks a suspended account with a clear message", async () => {
    await expect(
      services.auth.login({
        email: "sara.bekele@example.com",
        password: DEMO_PASSWORD,
      }),
    ).rejects.toThrow(/suspended/i);
  });

  it("blocks an administrator whose account is pending", async () => {
    await expect(
      services.auth.login({
        email: "meron.tesfaye@myhealth.et",
        password: DEMO_PASSWORD,
      }),
    ).rejects.toThrow(/awaiting approval/i);
  });

  it("clears the session on logout", async () => {
    await services.auth.login({
      email: patientAccount.email,
      password: DEMO_PASSWORD,
    });
    expect(services.auth.getSession()).not.toBeNull();

    await services.auth.logout();
    expect(services.auth.getSession()).toBeNull();
    expect(await services.auth.getCurrentUser()).toBeNull();
  });

  it("keeps a non-remembered session out of localStorage", async () => {
    await services.auth.login({
      email: patientAccount.email,
      password: DEMO_PASSWORD,
      remember: false,
    });

    expect(window.localStorage.getItem("myhealth:auth:v1")).toBeNull();
    expect(
      window.sessionStorage.getItem("myhealth:auth-session:v1"),
    ).not.toBeNull();
  });
});
