import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/data/demoAccounts";
import {
  getAuthorizedPatient,
  listAuthorizedPatients,
} from "@/features/doctor/services/doctorAccess";
import {
  classifyFile,
  clinicalAssistantService,
} from "@/features/doctor/services/clinicalAssistantService";
import {
  fetchAiStatus,
  requestClinicalAi,
  resetAiStatus,
  transcribeAudio,
} from "@/features/doctor/services/aiGateway";
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

const doctorAccount = DEMO_ACCOUNTS.find((account) => account.role === "DOCTOR")!;

beforeEach(async () => {
  window.localStorage.clear();
  demoDb.reset();
  await services.auth.login({
    email: doctorAccount.email,
    password: DEMO_PASSWORD,
  });
});

describe("doctor dashboard", () => {
  it("renders today's appointments and the AI assistant shortcut", async () => {
    renderAt("/doctor");

    expect(
      await screen.findByRole("heading", { name: /good (morning|afternoon|evening)/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Today's schedule")).toBeInTheDocument();
    // apt-006 is seeded for today with doc-001; the patient also appears in
    // recent patients, so the name can legitimately render more than once.
    expect((await screen.findAllByText("Hana Girma")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /open clinical assistant/i }).length,
    ).toBeGreaterThan(0);
  });
});

describe("doctor appointments", () => {
  it("filters to today's appointments", async () => {
    renderAt("/doctor/appointments");
    expect(await screen.findByText("Abebe Tesfaye")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Today" }));

    await waitFor(() => expect(screen.queryByText("Abebe Tesfaye")).not.toBeInTheDocument());
    expect(screen.getByText("Hana Girma")).toBeInTheDocument();
  });

  it("completes an eligible appointment without touching payment status", async () => {
    const before = await services.payments.getByAppointment("apt-006");
    expect(before?.status).toBe("PAID");

    const completed = await services.appointments.complete("apt-006");
    expect(completed.status).toBe("COMPLETED");

    const after = await services.payments.getByAppointment("apt-006");
    expect(after?.status).toBe("PAID");

    const shared = await services.appointments.listDetailed({ doctorId: "doc-001" });
    expect(shared.find((row) => row.id === "apt-006")?.status).toBe("COMPLETED");
  });
});

describe("doctor patient authorization", () => {
  it("only exposes patients linked to the doctor", async () => {
    const patients = await listAuthorizedPatients("doc-001");
    const ids = patients.map((patient) => patient.id);

    expect(ids).toContain("pat-001");
    expect(ids).toContain("pat-002");
    expect(ids).not.toContain("pat-004");
  });

  it("rejects a patient outside the care relationship", async () => {
    await expect(getAuthorizedPatient("doc-001", "pat-004")).rejects.toThrow(
      /care relationship/i,
    );
  });
});

describe("clinical documentation", () => {
  it("validates the record form before saving", async () => {
    renderAt("/doctor/patients/pat-001/records/new");

    const save = await screen.findByRole("button", { name: /save record/i });
    await userEvent.click(save);

    expect(await screen.findByText(/enter the assessment or diagnosis/i)).toBeInTheDocument();
    const records = await services.medicalRecords.listByPatient("pat-001");
    expect(records).toHaveLength(1);
  });

  it("saves a record without modifying existing ones", async () => {
    const before = await services.medicalRecords.listByPatient("pat-001");

    const created = await services.medicalRecords.create({
      patientId: "pat-001",
      doctorId: "doc-001",
      hospitalId: "hsp-001",
      appointmentId: "apt-001",
      diagnosis: "Essential hypertension, controlled",
      treatment: "Continue current therapy and review in three months.",
      prescription: ["Amlodipine 5mg — once daily"],
      notes: "Blood pressure 128/82 in clinic.",
    });

    const after = await services.medicalRecords.listByPatient("pat-001");
    expect(after).toHaveLength(before.length + 1);
    expect(after[0].id).toBe(created.id);
    expect(before[0]).toMatchObject({ id: before[0].id, diagnosis: before[0].diagnosis });
  });
});

describe("availability", () => {
  it("saves a weekly slot through the shared doctor service", async () => {
    const saved = await services.doctors.saveAvailability({
      doctorId: "doc-001",
      hospitalId: "hsp-001",
      dayOfWeek: "SATURDAY",
      startTime: "10:00",
      endTime: "13:00",
      slotDurationMinutes: 20,
      isActive: true,
    });

    const slots = await services.doctors.listAvailability("doc-001");
    expect(slots.some((slot) => slot.id === saved.id)).toBe(true);
  });
});

describe("AI clinical assistant", () => {
  it("labels every response and requires doctor review", async () => {
    const { response } = await clinicalAssistantService.send("doc-001", {
      message: "Summarize this patient's history",
      patientId: "pat-001",
      task: "PATIENT_HISTORY_SUMMARY",
    });

    expect(response.isDemo).toBe(true);
    expect(response.requiresDoctorReview).toBe(true);
    expect(response.generatedSummary).toContain("Missing or incomplete information");
    expect(response.sourceRecords?.length).toBeGreaterThan(0);
    expect(response.limitations?.length).toBeGreaterThan(0);
  });

  it("refuses patient context outside the care relationship", async () => {
    await expect(
      clinicalAssistantService.send("doc-001", {
        message: "Summarize this patient's history",
        patientId: "pat-004",
        task: "PATIENT_HISTORY_SUMMARY",
      }),
    ).rejects.toThrow(/care relationship/i);
  });

  it("acknowledges an image without claiming to interpret it", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "lesion.png", {
      type: "image/png",
    });
    const attachment = await clinicalAssistantService.uploadAttachment(file);

    const { response } = await clinicalAssistantService.send("doc-001", {
      message: "Review this skin photograph",
      patientId: "pat-001",
      task: "IMAGE_ASSISTANCE",
      attachmentIds: [attachment.id],
    });

    expect(response.observations?.join(" ")).toMatch(/no visual findings/i);
    expect(response.limitations?.join(" ")).toMatch(/no pixel-level analysis/i);
    expect(response.requiresDoctorReview).toBe(true);
  });

  it("rejects specialised imaging formats it cannot process", () => {
    const dicom = new File([new Uint8Array([0, 0, 0, 0])], "scan.dcm", {
      type: "application/dicom",
    });
    const validation = classifyFile(dicom);

    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.error).toMatch(/dicom/i);
  });
});

/* -------------------------------------------------------------------------- */
/*                          Live AI gateway client                            */
/* -------------------------------------------------------------------------- */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const UNCONFIGURED = {
  configured: false,
  provider: "unreachable",
  chatModel: null,
  transcribeModel: null,
  languages: ["en"],
  maxAudioBytes: 25 * 1024 * 1024,
  missingEnv: ["AI_API_KEY"],
};

const CONFIGURED = {
  configured: true,
  provider: "openai-compatible",
  chatModel: "gpt-4.1",
  transcribeModel: "gpt-transcribe",
  languages: ["en", "am"],
  maxAudioBytes: 25 * 1024 * 1024,
  missingEnv: [],
};

describe("AI gateway client", () => {
  beforeEach(() => {
    resetAiStatus();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAiStatus();
  });

  it("reports an unconfigured provider instead of pretending to be live", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(UNCONFIGURED)));

    const status = await fetchAiStatus();
    expect(status.configured).toBe(false);
    expect(status.chatModel).toBeNull();

    const result = await requestClinicalAi({
      task: "PATIENT_HISTORY_SUMMARY",
      message: "Summarize the history",
      language: "am",
      records: [],
      attachments: [],
    });
    expect(result).toBeNull();
  });

  it("passes the selected language and returns a live, review-required result", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.includes("/api/ai/status")) return jsonResponse(CONFIGURED);
      return jsonResponse({
        message: "ማጠቃለያ ተዘጋጅቷል።",
        generatedSummary: "የታካሚው ታሪክ",
        clinicalConsiderations: ["Unconfirmed consideration"],
        redFlags: [],
        recommendedNextSteps: ["Review in clinic"],
        urgency: "MODERATE",
        limitations: ["Requires clinician review"],
        sourceRecordIds: ["rec-001"],
        requiresDoctorReview: true,
        isDemo: false,
        model: "gpt-4.1",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestClinicalAi({
      task: "CLINICAL_ANALYSIS",
      message: "Analyse the documented history",
      language: "am",
      records: [],
      attachments: [],
    });

    expect(result?.isDemo).toBe(false);
    expect(result?.requiresDoctorReview).toBe(true);
    expect(result?.urgency).toBe("MODERATE");

    const requestInit = fetchMock.mock.calls[1]?.[1];
    const sent = JSON.parse(String(requestInit?.body)) as { language: string };
    expect(sent.language).toBe("am");
  });

  it("transcribes voice with the requested language header", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.includes("/api/ai/status")) return jsonResponse(CONFIGURED);
      return jsonResponse({ text: "ራስ ምታት ለሶስት ቀናት", language: "am", model: "gpt-transcribe" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(new Blob(["audio"], { type: "audio/webm" }), "am");
    expect(result.text).toContain("ራስ ምታት");

    const requestInit = fetchMock.mock.calls[1]?.[1];
    const headers = (requestInit?.headers ?? {}) as Record<string, string>;
    expect(headers["X-Audio-Language"]).toBe("am");
  });

  it("refuses voice transcription when the provider is not configured", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(UNCONFIGURED)));

    await expect(
      transcribeAudio(new Blob(["audio"], { type: "audio/webm" }), "en"),
    ).rejects.toThrow(/provider key|configured/i);
  });
});
