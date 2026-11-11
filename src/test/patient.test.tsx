import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/data/demoAccounts";
import { demoDb, services } from "@/services";
import { appRoutes } from "@/routes/AppRoutes";
import { listSlots, weekdayOf } from "@/components/appointments/scheduling";
import type { DoctorAvailability } from "@/types";
import { daysFromNowISO } from "@/utils/format";
import { calculateAge, calculateBmi, toPatientHealthContext } from "@/utils/health";

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

const patientAccount = DEMO_ACCOUNTS.find((account) => account.role === "PATIENT")!;

async function signInPatient() {
  await services.auth.login({
    email: patientAccount.email,
    password: DEMO_PASSWORD,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  demoDb.reset();
});

describe("health profile helpers", () => {
  it("only calculates BMI when both measurements are valid", () => {
    expect(calculateBmi(undefined, 175)).toBeNull();
    expect(calculateBmi(78, undefined)).toBeNull();
    expect(calculateBmi(0, 175)).toBeNull();
    expect(calculateBmi(78, 175)).toBe(25.5);
  });

  it("calculates age from a date of birth", () => {
    const birthYear = new Date().getFullYear() - 30;
    expect(calculateAge(`${birthYear}-01-01`)).toBe(30);
    expect(calculateAge(undefined)).toBeUndefined();
  });

  it("never invents missing patient context", () => {
    const context = toPatientHealthContext({
      id: "pat-001",
      email: "patient@myhealth.et",
      fullName: "Demo Patient",
      role: "PATIENT",
      createdAt: "2026-01-01T00:00:00.000Z",
      weightKg: 70,
    });

    expect(context.weightKg).toBe(70);
    expect(context.age).toBeUndefined();
    expect(context.heightCm).toBeUndefined();
    expect(context.allergies).toBeUndefined();
  });
});

describe("booking slots", () => {
  it("only offers published slots that are still free", () => {
    const date = daysFromNowISO(1);
    const availability: DoctorAvailability[] = [
      {
        id: "avl-test",
        doctorId: "doc-002",
        hospitalId: "hsp-001",
        dayOfWeek: weekdayOf(date),
        startTime: "09:00",
        endTime: "11:00",
        slotDurationMinutes: 30,
        isActive: true,
      },
    ];

    const slots = listSlots(availability, ["09:30"], date);
    expect(slots.map((slot) => slot.startTime)).toEqual(["09:00", "10:00", "10:30"]);
  });
});

describe("AI health assistant service", () => {
  it("rejects unsupported image types before upload", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(services.aiHealth.uploadImage(file)).rejects.toThrow(/jpg, png or webp/i);
  });

  it("rejects images over the configured limit", async () => {
    const file = { name: "huge.png", type: "image/png", size: 8 * 1024 * 1024 } as File;
    await expect(services.aiHealth.uploadImage(file)).rejects.toThrow(/smaller than/i);
  });

  it("returns emergency guidance from the service, clearly marked as mock", async () => {
    const response = await services.aiHealth.sendMessage({
      patientId: "pat-001",
      message: "I have severe chest pain and cannot breathe",
      patientContext: { age: 37 },
    });

    expect(response.urgency).toBe("EMERGENCY");
    expect(response.isMock).toBe(true);
    expect(response.message).toMatch(/emergency/i);
    expect(response.disclaimer).toMatch(/demo response/i);
  });

  it("passes patient context and image references through the contract", async () => {
    const uploaded = await services.aiHealth.uploadImage(
      new File([new Uint8Array([1, 2, 3])], "rash.png", { type: "image/png" }),
    );

    const response = await services.aiHealth.sendMessage({
      patientId: "pat-001",
      message: "There is an itchy rash on both of my arms",
      patientContext: { age: 37, allergies: ["Penicillin"] },
      imageIds: [uploaded.id],
    });

    const conversation = await services.aiHealth.getConversation(response.conversationId);
    expect(conversation?.messages).toHaveLength(2);
    expect(conversation?.messages[0].attachments).toHaveLength(1);
    expect(conversation?.messages[1].content).toMatch(/penicillin/i);
    expect(conversation?.messages[1].isMock).toBe(true);
  });

  it("refuses to continue another patient's conversation", async () => {
    const conversation = await services.aiHealth.startConversation("pat-001");
    await expect(
      services.aiHealth.sendMessage({
        conversationId: conversation.id,
        patientId: "pat-002",
        message: "Can you see this conversation?",
        patientContext: {},
      }),
    ).rejects.toThrow(/do not have access/i);
  });
});

describe("shared appointment state", () => {
  it("reflects a patient cancellation for the doctor and hospital", async () => {
    const created = await services.appointments.create({
      patientId: "pat-001",
      doctorId: "doc-002",
      hospitalId: "hsp-001",
      date: daysFromNowISO(12),
      startTime: "10:00",
      endTime: "10:30",
      reason: "Persistent cough for one week.",
      paymentMethod: "PAY_AT_HOSPITAL",
    });

    const cancelled = await services.appointments.cancel(created.id);
    expect(cancelled.status).toBe("CANCELLED");

    const asDoctor = await services.appointments.getById(created.id);
    expect(asDoctor?.status).toBe("CANCELLED");

    const asHospital = await services.appointments.listDetailed({ hospitalId: "hsp-001" });
    expect(asHospital.find((row) => row.id === created.id)?.status).toBe("CANCELLED");

    const payment = await services.payments.getByAppointment(created.id);
    expect(payment?.status).toBe("UNPAID_AT_HOSPITAL");
  });
});

describe("patient pages", () => {
  it("updates the BMI preview from the weight and height fields", async () => {
    await signInPatient();
    renderAt("/patient/profile");

    await screen.findByRole("heading", { name: /my profile/i });

    const weight = await screen.findByLabelText(/weight \(kg\)/i);
    const height = screen.getByLabelText(/height \(cm\)/i);
    await userEvent.clear(weight);
    await userEvent.clear(height);
    await userEvent.type(weight, "70");
    await userEvent.type(height, "175");

    expect(screen.getByText("22.9")).toBeInTheDocument();
  });

  it("sends a symptom message and labels the demo reply", async () => {
    await signInPatient();
    renderAt("/patient/assistant");

    const composer = await screen.findByLabelText(/message the ai health assistant/i);
    await userEvent.type(composer, "I have had a headache for three days and feel dizzy");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/mock demo response/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("lists the patient's upcoming appointments", async () => {
    await signInPatient();
    renderAt("/patient/appointments");

    expect(
      await screen.findByText(/dr\. selamawit bekele/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("marks every notification as read", async () => {
    await signInPatient();
    renderAt("/patient/notifications");

    await userEvent.click(
      await screen.findByRole("button", { name: /mark all as read/i }),
    );

    expect(
      await screen.findByText(/all caught up/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
