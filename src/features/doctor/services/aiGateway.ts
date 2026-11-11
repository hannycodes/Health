import { ApiError } from "@/lib/http";
import type { AppointmentWithDetails, MedicalRecord, Patient } from "@/types";

/**
 * Browser client for the clinical AI gateway (`server/index.mjs`).
 *
 * The provider key lives on the server; this module only talks to same-origin
 * `/api/ai/*` routes. When the gateway is missing or unconfigured, callers fall
 * back to the labelled demonstration adapter.
 */

export type AiLanguage = "en" | "am";

export interface AiStatus {
  configured: boolean;
  provider: string;
  chatModel: string | null;
  transcribeModel: string | null;
  languages: string[];
  maxAudioBytes: number;
  missingEnv: string[];
}

export interface ClinicalAiRequest {
  task: string;
  message: string;
  language: AiLanguage;
  patient?: Pick<Patient, "id" | "fullName" | "dateOfBirth" | "gender" | "bloodType">;
  records: MedicalRecord[];
  doctorNames?: Record<string, string>;
  hospitalNames?: Record<string, string>;
  appointments?: Array<Pick<AppointmentWithDetails, "date" | "startTime" | "status" | "reason">>;
  attachments: Array<{
    kind: "image" | "document";
    name: string;
    mimeType: string;
    dataUrl?: string;
  }>;
}

export interface ClinicalAiResult {
  message: string;
  generatedSummary?: string;
  observations?: string[];
  clinicalConsiderations?: string[];
  redFlags?: string[];
  recommendedNextSteps?: string[];
  urgency?: "LOW" | "MODERATE" | "HIGH" | "EMERGENCY";
  followUpQuestions?: string[];
  limitations?: string[];
  sourceRecordIds?: string[];
  requiresDoctorReview: boolean;
  isDemo: false;
  model?: string;
}

let statusPromise: Promise<AiStatus> | null = null;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

/** Cached provider status; call `resetAiStatus()` after changing server env. */
export async function fetchAiStatus(): Promise<AiStatus> {
  statusPromise ??= (async () => {
    try {
      const response = await fetch("/api/ai/status", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = (await readJson(response)) as Partial<AiStatus> | null;
      return {
        configured: Boolean(data?.configured),
        provider: data?.provider ?? "openai-compatible",
        chatModel: data?.chatModel ?? null,
        transcribeModel: data?.transcribeModel ?? null,
        languages: data?.languages ?? ["en"],
        maxAudioBytes: data?.maxAudioBytes ?? 25 * 1024 * 1024,
        missingEnv: data?.missingEnv ?? [],
      };
    } catch {
      return {
        configured: false,
        provider: "unreachable",
        chatModel: null,
        transcribeModel: null,
        languages: ["en"],
        maxAudioBytes: 25 * 1024 * 1024,
        missingEnv: ["AI_API_KEY"],
      };
    }
  })();

  return statusPromise;
}

export function resetAiStatus() {
  statusPromise = null;
}

/** True when the gateway exists and has a provider key. */
export async function isAiConfigured(): Promise<boolean> {
  const status = await fetchAiStatus();
  return status.configured;
}

/**
 * Ask the live model for clinical decision support.
 *
 * Returns `null` (rather than throwing) when no provider is configured, so the
 * caller can fall back to the demonstration adapter and label it honestly.
 */
export async function requestClinicalAi(
  request: ClinicalAiRequest,
): Promise<ClinicalAiResult | null> {
  if (!(await isAiConfigured())) return null;

  const payload = {
    task: request.task,
    message: request.message,
    language: request.language,
    patient: request.patient,
    records: request.records.map((record) => ({
      ...record,
      doctorName: request.doctorNames?.[record.doctorId],
      hospitalName: request.hospitalNames?.[record.hospitalId],
    })),
    appointments: request.appointments,
    attachments: request.attachments,
  };

  const response = await fetch("/api/ai/clinical", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await readJson(response);

  if (response.status === 503) return null;

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: errorMessage(data, "The clinical AI service is unavailable."),
    });
  }

  if (!data || typeof data !== "object") {
    throw new ApiError({ status: 502, message: "The AI service returned no result." });
  }

  if (!("message" in data) || typeof (data as { message?: unknown }).message !== "string") {
    throw new ApiError({ status: 502, message: "The AI service returned an unexpected result." });
  }

  return data as ClinicalAiResult;
}

/** Transcribe a recorded voice message in the requested language. */
export async function transcribeAudio(
  audio: Blob,
  language: AiLanguage | "auto",
): Promise<{ text: string; language: string; model?: string }> {
  const status = await fetchAiStatus();
  if (!status.configured) {
    throw new ApiError({
      status: 503,
      message: "Voice transcription needs the AI gateway and a provider key.",
    });
  }

  if (audio.size > status.maxAudioBytes) {
    throw new ApiError({
      status: 413,
      message: "That recording is too long. Keep voice messages under 25 MB.",
    });
  }

  const response = await fetch("/api/ai/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": audio.type || "audio/webm",
      "X-Audio-Language": language,
    },
    body: audio,
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: errorMessage(data, "Voice transcription failed."),
    });
  }

  const text =
    data && typeof data === "object" && "text" in data
      ? (data as { text?: unknown }).text
      : undefined;

  if (typeof text !== "string") {
    throw new ApiError({ status: 502, message: "Transcription returned no text." });
  }

  return {
    text,
    language:
      data && typeof data === "object" && "language" in data
        ? String((data as { language?: unknown }).language ?? language)
        : language,
    model:
      data && typeof data === "object" && "model" in data
        ? String((data as { model?: unknown }).model ?? "")
        : undefined,
  };
}
