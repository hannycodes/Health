/**
 * MyHealth — clinical AI gateway.
 *
 * A deliberately dependency-free Node server that keeps the provider API key
 * server-side. The browser never sees the key; it only calls same-origin
 * `/api/ai/*` routes, which Vite proxies to this process in development.
 *
 * SECURITY / SAFETY NOTES
 * - The provider key is read from the environment only. Never send it to a
 *   browser, log it, or put it in a VITE_* variable.
 * - Request bodies are never logged. Only method, path, status and duration are.
 * - Patient context is supplied by the caller's authorised record set. In
 *   production the hospital backend must resolve `patientId` to records itself
 *   and enforce the doctor's access rights; this process is a demo gateway.
 * - Output is decision support. The prompt forbids confirmed diagnoses,
 *   prescriptions and dosage orders, and always requires clinician review.
 */

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.AI_PORT ?? 8787);
const API_KEY = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
// Defaults target Z.ai's OpenAI-compatible endpoint: GLM-4.5V is the vision
// model, GLM-ASR-2512 the speech model. Override with env vars for any other
// OpenAI-compatible provider.
const BASE_URL = (process.env.AI_BASE_URL ?? "https://api.z.ai/api/paas/v4").replace(
  /\/$/,
  "",
);
const CHAT_MODEL = process.env.AI_CHAT_MODEL ?? "glm-4.5v";
const TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL ?? "glm-asr-2512";
const MAX_JSON_BYTES = 30 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;

const LANGUAGE_LABEL = {
  en: "English",
  am: "Amharic (አማርኛ)",
};

const SYSTEM_PROMPT = `You are the MyHealth Clinical Assistant, decision-support software used by licensed physicians.

NON-NEGOTIABLE SAFETY RULES
- You support a clinician's judgement. You never replace it.
- Never present a confirmed diagnosis. Never prescribe, never give medication dosages as orders.
- Never invent history, findings, laboratory values, allergies, vitals or dates.
- Use only the patient records supplied in this request. If a required fact is absent, say it is not recorded.
- If an image is supplied, describe only what is visible and state that imaging interpretation by a general-purpose model is unreliable and not a radiology report.
- Every output is a draft requiring clinician review. Say so in "limitations".
- Do not claim certainty you do not have. If the data is insufficient, say what is missing.

CLINICAL REASONING (when the task asks for analysis)
- Separate "Documented findings" (only what the records state) from "Clinical considerations" (possible explanations to evaluate, explicitly unconfirmed).
- Flag red-flag features that would require urgent escalation, based only on documented data.
- Suggest next steps a clinician might consider (history to clarify, examination, investigations, follow-up).
- Give an urgency level based strictly on documented features: LOW, MODERATE, HIGH or EMERGENCY.

LANGUAGE
- Write every human-readable field in the requested output language. Amharic must be natural Amharic, not transliteration. Keep record IDs, drug names and units unchanged.

OUTPUT FORMAT
Return a single JSON object with exactly these keys:
{
  "message": string,                     // one or two sentences summarising what you did
  "generatedSummary": string | null,     // structured markdown-ish plain text when a summary or note is requested
  "observations": string[],              // short factual observations
  "clinicalConsiderations": string[],    // possible explanations, always framed as unconfirmed
  "redFlags": string[],                  // urgent features documented in the data
  "recommendedNextSteps": string[],      // suggestions for the clinician to consider
  "urgency": "LOW" | "MODERATE" | "HIGH" | "EMERGENCY" | null,
  "followUpQuestions": string[],
  "limitations": string[],               // must include that this requires clinician review
  "sourceRecordIds": string[]            // ids of records you actually used
}
Return JSON only. No prose outside the object.`;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Audio-Language");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`Request body exceeds ${limit} bytes.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function languageInstruction(language) {
  const label = LANGUAGE_LABEL[language] ?? LANGUAGE_LABEL.en;
  return `Requested output language: ${label}.`;
}

function formatPatientContext(payload) {
  const lines = [];

  if (payload.patient) {
    const patient = payload.patient;
    lines.push("PATIENT (authorised to this clinician)");
    lines.push(`- id: ${patient.id}`);
    lines.push(`- name: ${patient.fullName ?? "not recorded"}`);
    lines.push(`- date of birth: ${patient.dateOfBirth ?? "not recorded"}`);
    lines.push(`- sex: ${patient.sex ?? "not recorded"}`);
    lines.push(`- blood type: ${patient.bloodType ?? "not recorded"}`);
    lines.push(`- allergies: ${patient.allergies ?? "not recorded in this dataset"}`);
    lines.push(
      `- existing conditions: ${patient.conditions ?? "not recorded as a structured field"}`,
    );
    lines.push("");
  }

  const records = Array.isArray(payload.records) ? payload.records : [];
  lines.push(`MEDICAL RECORDS (${records.length})`);
  if (records.length === 0) {
    lines.push("- No records are available for this patient.");
  } else {
    for (const record of records) {
      lines.push(
        [
          `- recordId: ${record.id}`,
          `  date: ${record.recordedAt ?? "unknown"}`,
          `  doctor: ${record.doctorName ?? "unknown"}`,
          `  hospital: ${record.hospitalName ?? "unknown"}`,
          `  diagnosis: ${record.diagnosis || "not recorded"}`,
          `  treatment: ${record.treatment || "not recorded"}`,
          `  prescription: ${
            Array.isArray(record.prescription) && record.prescription.length
              ? record.prescription.join("; ")
              : "none recorded"
          }`,
          `  notes: ${record.notes || "none"}`,
        ].join("\n"),
      );
    }
  }
  lines.push("");

  const appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
  if (appointments.length > 0) {
    lines.push("APPOINTMENTS");
    for (const appointment of appointments.slice(0, 10)) {
      lines.push(
        `- ${appointment.date} ${appointment.startTime ?? ""} · ${appointment.status} · ${appointment.reason ?? ""}`,
      );
    }
    lines.push("");
  }

  lines.push(`DOCTOR REQUEST (task: ${payload.task})`);
  lines.push(payload.message || "(no additional text)");
  return lines.join("\n");
}

function buildUserContent(payload) {
  const content = [{ type: "text", text: formatPatientContext(payload) }];
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];

  for (const attachment of attachments) {
    if (attachment.kind === "image" && typeof attachment.dataUrl === "string") {
      content.push({
        type: "image_url",
        image_url: { url: attachment.dataUrl, detail: "auto" },
      });
    } else {
      content.push({
        type: "text",
        text: `[Attached document "${attachment.name}" (${attachment.mimeType}). Its contents were NOT extracted. Do not claim to have read it.]`,
      });
    }
  }

  return content;
}

function normaliseResponse(raw, payload) {
  const str = (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const list = (value) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
      : undefined;

  const validRecordIds = new Set(
    (Array.isArray(payload.records) ? payload.records : []).map((record) => record.id),
  );
  const sources = (Array.isArray(raw.sourceRecordIds) ? raw.sourceRecordIds : [])
    .filter((id) => validRecordIds.has(id));

  const limitations = list(raw.limitations) ?? [];
  limitations.push(
    "Generated by an AI model as decision support. A clinician must review it before it is used in documentation.",
  );
  if ((payload.attachments ?? []).some((item) => item.kind === "document")) {
    limitations.push(
      "Attached documents were not parsed, so their contents were not read by the model.",
    );
  }

  const urgency = ["LOW", "MODERATE", "HIGH", "EMERGENCY"].includes(raw.urgency)
    ? raw.urgency
    : undefined;

  return {
    message: str(raw.message) ?? "Draft prepared for clinician review.",
    generatedSummary: str(raw.generatedSummary),
    observations: list(raw.observations),
    clinicalConsiderations: list(raw.clinicalConsiderations),
    redFlags: list(raw.redFlags),
    recommendedNextSteps: list(raw.recommendedNextSteps),
    urgency,
    followUpQuestions: list(raw.followUpQuestions),
    limitations,
    sourceRecordIds: sources,
    requiresDoctorReview: true,
    isDemo: false,
  };
}

async function callProvider(path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${API_KEY}`, ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function providerError(status, detail) {
  const outOfCredit = /insufficient balance|no resource package|recharge|quota/i.test(detail ?? "");

  if (outOfCredit) {
    return {
      status: 402,
      payload: {
        error:
          "The AI provider account has no remaining balance. Top up the provider account to enable live analysis.",
        providerStatus: status,
        detail,
      },
    };
  }

  const message =
    status === 401 || status === 403
      ? "The AI provider rejected the configured API key."
      : status === 429
        ? "The AI provider rate limit was reached. Try again shortly."
        : `The AI provider returned HTTP ${status}.`;
  return { status: 502, payload: { error: message, providerStatus: status, detail } };
}

async function handleClinical(req, res) {
  const body = await readBody(req, MAX_JSON_BYTES);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  if (typeof payload?.message !== "string" || !payload.task) {
    sendJson(res, 400, { error: "A task and message are required." });
    return;
  }
  if (!API_KEY) {
    sendJson(res, 503, {
      error: "The AI provider is not configured on the server.",
      configured: false,
    });
    return;
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserContent(payload),
    },
    {
      role: "user",
      content: languageInstruction(payload.language),
    },
  ];

  const chatRequest = (jsonMode) =>
    callProvider("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 1800,
        // Reasoning tokens can consume the whole budget and delay the answer;
        // the assistant returns structured JSON and does not need them.
        thinking: { type: "disabled" },
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

  let upstream = await chatRequest(true);
  if (!upstream.ok && upstream.status === 400) {
    // Some OpenAI-compatible providers reject response_format; retry plainly
    // and rely on the prompt plus the tolerant parser below.
    upstream = await chatRequest(false);
  }

  if (!upstream.ok) {
    let detail = "";
    try {
      const errorBody = await upstream.json();
      detail = errorBody?.error?.message ?? "";
    } catch {
      detail = "";
    }
    const failure = providerError(upstream.status, detail.slice(0, 300));
    sendJson(res, failure.status, failure.payload);
    return;
  }

  const data = await upstream.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    sendJson(res, 502, { error: "The AI provider returned an empty response." });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // The model replied with prose instead of JSON. Surface it as a message
    // rather than pretending it was structured.
    sendJson(res, 200, {
      message: content.slice(0, 4000),
      observations: [],
      limitations: [
        "The model returned unstructured text, so no structured fields are available.",
        "Generated by an AI model as decision support. A clinician must review it before use.",
      ],
      sourceRecordIds: [],
      requiresDoctorReview: true,
      isDemo: false,
    });
    return;
  }

  sendJson(res, 200, {
    ...normaliseResponse(parsed, payload),
    model: data?.model ?? CHAT_MODEL,
  });
}

// The speech model accepts WAV and MP3. The browser converts recordings to
// mono 16 kHz WAV before upload, so anything else is rejected explicitly.
const AUDIO_EXTENSIONS = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

async function handleTranscribe(req, res) {
  if (!API_KEY) {
    sendJson(res, 503, {
      error: "The AI provider is not configured on the server.",
      configured: false,
    });
    return;
  }

  const audio = await readBody(req, MAX_AUDIO_BYTES);
  if (audio.length === 0) {
    sendJson(res, 400, { error: "No audio was received." });
    return;
  }

  const contentType = (req.headers["content-type"] ?? "audio/wav").split(";")[0].trim();
  const extension = AUDIO_EXTENSIONS[contentType];
  if (!extension) {
    sendJson(res, 415, {
      error: `Unsupported audio type "${contentType}". Convert the recording to WAV or MP3 first.`,
    });
    return;
  }

  const requestedLanguage = String(req.headers["x-audio-language"] ?? "auto");
  const language = ["en", "am"].includes(requestedLanguage) ? requestedLanguage : undefined;

  const form = new FormData();
  form.append("file", new Blob([audio], { type: contentType }), `consultation.${extension}`);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("stream", "false");
  // GLM-ASR auto-detects the language; the documented way to bias detection is
  // a short prompt written in the expected language.
  if (language) {
    form.append(
      "prompt",
      language === "am"
        ? "የሕክምና ውይይት። በአማርኛ ጻፍ።"
        : "Clinical consultation. Transcribe in English.",
    );
  }

  const upstream = await callProvider("/audio/transcriptions", {
    method: "POST",
    body: form,
  });

  if (!upstream.ok) {
    let detail = "";
    try {
      const errorBody = await upstream.json();
      detail = errorBody?.error?.message ?? "";
    } catch {
      detail = "";
    }
    const failure = providerError(upstream.status, detail.slice(0, 300));
    sendJson(res, failure.status, failure.payload);
    return;
  }

  const data = await upstream.json();
  sendJson(res, 200, {
    text: typeof data?.text === "string" ? data.text : "",
    language: data?.language ?? language ?? "unknown",
    model: TRANSCRIBE_MODEL,
  });
}

/* -------------------------------------------------------------------------- */
/*                        Patient health assistant                            */
/* -------------------------------------------------------------------------- */

/** Uploaded images and conversations stay in memory: never written to disk. */
const patientImages = new Map();
const patientConversations = new Map();
const PATIENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PATIENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PATIENT_EMERGENCY_PATTERNS = [
  "chest pain",
  "crushing chest",
  "cannot breathe",
  "can't breathe",
  "not breathing",
  "difficulty breathing",
  "slurred speech",
  "face drooping",
  "severe bleeding",
  "unconscious",
  "sudden weakness",
  "suicidal",
  "የደረት ሕመም",
  "መተንፈስ አልችልም",
  "ደም መፍሰስ",
  "ንቃተ ህሊና",
];

const PATIENT_DISCLAIMER =
  "This is general health information from MyHealth, not a diagnosis or a prescription. A qualified clinician must assess your symptoms.";

const PATIENT_SYSTEM_PROMPT = `You are the MyHealth patient guidance assistant. Give general health information and help the patient decide what to do next.
Hard rules:
- Never diagnose, never claim certainty, never prescribe or suggest doses.
- Never claim an image confirms or rules out a condition.
- If symptoms could be life-threatening, set urgency to "EMERGENCY" and tell the patient to contact emergency services now.
- Be calm, plain and concise.
- Use only the supplied patient context; never invent values.
- Write every string in the patient's language: English or Amharic (አማርኛ).
Return ONLY JSON: {"message":"string","urgency":"EMERGENCY|URGENT|ROUTINE|INFORMATIONAL","followUpQuestions":["..."],"recommendations":["..."],"recommendedSpecialty":"specialty or empty string","disclaimer":"string"}`;

const PATIENT_EMERGENCY = {
  en: {
    message:
      "What you described may be a medical emergency. Call your local emergency number or go to the nearest emergency department now. Do not wait for an appointment, and do not drive yourself if you feel faint.",
    recommendations: [
      "Call emergency services now.",
      "Ask someone nearby to stay with you.",
    ],
  },
  am: {
    message:
      "የገለጹት ምልክት የድንገተኛ ሕክምና ሁኔታ ሊሆን ይችላል። አሁን ወደ አቅራቢያዎ የድንገተኛ ክፍል ይሂዱ ወይም የድንገተኛ አገልግሎት ቁጥር ይደውሉ። ቀጠሮ አይጠብቁ።",
    recommendations: [
      "አሁን የድንገተኛ አገልግሎት ይደውሉ።",
      "አካላዊ ጉዳት ካለ በአቅራቢያዎ ያለ ሰው ይጠይቁ።",
    ],
  },
};

const AMHARIC_UNAVAILABLE = {
  message:
    "ይቅርታ፣ አሁን ስለዚህ ጉዳይ ትክክለኛ መልስ በአማርኛ መስጠት አልተቻለም። እባክዎ በእንግሊዝኛ እንደገና ይጠይቁ ወይም በኋላ ይሞክሩ። ምልክቶቹ አሳሳቢ ከሆኑ ወዲያውኑ ሐኪም ያማክሩ።",
  recommendations: [
    "ምልክቶቹ አሳሳቢ ከሆኑ ወዲያውኑ ሐኪም ያማክሩ።",
    "ትክክለኛ መልስ ለማግኘት በእንግሊዝኛ እንደገና ይጠይቁ።",
  ],
};

const ETHIOPIC = /[\u1200-\u137F]/;

function patientLanguage(message, requested) {
  if (ETHIOPIC.test(String(message ?? ""))) return "am";
  if (requested === "am" || requested === "en") return requested;
  return "en";
}

function parseJsonLoose(text) {
  const cleaned = String(text ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function askPatientModel({ message, patientContext, language, images, retry }) {
  const context =
    patientContext && Object.keys(patientContext).length
      ? `Patient context (saved by the patient, may be incomplete): ${JSON.stringify(patientContext)}`
      : "No patient context was provided. Do not invent any.";
  const userContent = [
    {
      type: "text",
      text: [
        language === "am"
          ? "አስፈላጊ፡ ሁሉንም መልስ በአማርኛ ብቻ ይጻፉ። Every string must be in Amharic (Ethiopic script)."
          : "Reply language: English. Every string must be in English.",
        context,
        images.length
          ? "The patient attached images. Describe only what is visible; an image cannot confirm a condition."
          : "",
        `Patient message: ${message || "(no text, image only)"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  for (const image of images) {
    userContent.push({ type: "image_url", image_url: { url: image.dataUrl } });
  }

  const messages = [
    { role: "system", content: PATIENT_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
  if (retry) {
    messages.push({
      role: "system",
      content:
        "Your previous draft was rejected: it was not in Amharic. Rewrite every string in Amharic using Ethiopic script.",
    });
  }

  const upstream = await callProvider("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: retry ? 0.1 : 0.2,
      max_tokens: 800,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!upstream.ok) {
    let detail = "";
    try {
      detail = (await upstream.json())?.error?.message ?? "";
    } catch {
      detail = "";
    }
    throw providerError(upstream.status, detail);
  }

  const data = await upstream.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonLoose(raw) ?? {};
  return {
    message:
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : String(raw).trim(),
    urgency: ["EMERGENCY", "URGENT", "ROUTINE", "INFORMATIONAL"].includes(parsed.urgency)
      ? parsed.urgency
      : "ROUTINE",
    followUpQuestions: Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 4).map(String)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 5).map(String)
      : [],
    recommendedSpecialty:
      typeof parsed.recommendedSpecialty === "string" ? parsed.recommendedSpecialty : "",
    disclaimer: PATIENT_DISCLAIMER,
  };
}

function hydrateConversation(conversation) {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      attachments: message.attachments.map((attachment) => ({
        ...attachment,
        previewUrl: patientImages.get(attachment.id)?.dataUrl ?? "",
      })),
    })),
  };
}

async function handlePatientImage(req, res) {
  const body = await readBody(req, MAX_JSON_BYTES);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    sendJson(res, 400, { message: "Invalid JSON body." });
    return;
  }

  const mimeType = String(payload?.mimeType ?? "");
  if (!PATIENT_IMAGE_TYPES.includes(mimeType)) {
    sendJson(res, 415, { message: "Upload a JPG, PNG or WebP image." });
    return;
  }
  const dataUrl = String(payload?.dataBase64 ?? "");
  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    sendJson(res, 400, { message: "The image could not be read. Try attaching it again." });
    return;
  }
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const sizeBytes = Number(payload?.sizeBytes) || Math.floor((base64.length * 3) / 4);
  if (sizeBytes > PATIENT_IMAGE_MAX_BYTES) {
    sendJson(res, 413, { message: "Images must be smaller than 5 MB." });
    return;
  }

  const id = `img-${randomUUID().slice(0, 8)}`;
  patientImages.set(id, {
    id,
    fileName: String(payload?.fileName ?? "image"),
    mimeType,
    sizeBytes,
    dataUrl,
    uploadedAt: Date.now(),
  });
  for (const [key, image] of patientImages) {
    if (Date.now() - image.uploadedAt > 2 * 60 * 60 * 1000) patientImages.delete(key);
  }

  sendJson(res, 201, {
    id,
    fileName: String(payload?.fileName ?? "image"),
    mimeType,
    sizeBytes,
    previewUrl: dataUrl,
  });
}

async function handlePatientAdvice(req, res) {
  const body = await readBody(req, MAX_JSON_BYTES);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const message = String(payload?.message ?? "").trim();
  if (!message) {
    sendJson(res, 422, { error: "A message is required." });
    return;
  }
  if (!API_KEY) {
    sendJson(res, 503, {
      error: "The AI provider is not configured on the server.",
      configured: false,
    });
    return;
  }

  const history = Array.isArray(payload?.history) ? payload.history.slice(-8) : [];
  const historyText = history
    .filter((entry) => entry && typeof entry.content === "string" && entry.content.trim())
    .map(
      (entry) =>
        `${entry.role === "PATIENT" ? "Patient" : "Assistant"}: ${entry.content.trim()}`,
    )
    .join("\n");
  const language = patientLanguage(message, String(payload?.language ?? "auto"));
  const prompt = historyText
    ? `Earlier in this conversation:\n${historyText}\n\nNew patient message: ${message}`
    : message;

  try {
    const reply = await askPatientModel({
      message: prompt,
      patientContext: payload?.patientContext ?? {},
      language,
      images: [],
      retry: false,
    });
    sendJson(res, 200, { ...reply, isMock: false });
  } catch (error) {
    const failure = error && error.payload ? error : providerError(502, "");
    sendJson(res, failure.status, failure.payload);
  }
}

async function handlePatientMessage(req, res) {
  const body = await readBody(req, MAX_JSON_BYTES);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    sendJson(res, 400, { message: "Invalid JSON body." });
    return;
  }

  const patientId = String(payload?.patientId ?? "");
  const message = String(payload?.message ?? "").trim();
  const imageIds = Array.isArray(payload?.imageIds) ? payload.imageIds.map(String) : [];
  if (!patientId) {
    sendJson(res, 422, { message: "A patient is required." });
    return;
  }
  if (!message && imageIds.length === 0) {
    sendJson(res, 422, { message: "Describe your symptoms or attach an image before sending." });
    return;
  }

  const images = imageIds.map((id) => patientImages.get(id)).filter(Boolean);
  if (images.length !== imageIds.length) {
    sendJson(res, 400, { message: "That image reference is no longer available. Please attach it again." });
    return;
  }

  const requestedId = String(payload?.conversationId ?? "");
  let conversation = requestedId ? patientConversations.get(requestedId) : undefined;
  if (requestedId && !conversation) {
    sendJson(res, 404, { message: "This conversation is no longer available." });
    return;
  }
  if (conversation && conversation.patientId !== patientId) {
    sendJson(res, 403, { message: "You do not have access to this conversation." });
    return;
  }

  const language = patientLanguage(message, String(payload?.language ?? "auto"));
  const now = new Date().toISOString();
  if (!conversation) {
    conversation = {
      id: `cnv-${randomUUID().slice(0, 8)}`,
      patientId,
      title: message.replace(/\s+/g, " ").slice(0, 60) || "Image consultation",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    patientConversations.set(conversation.id, conversation);
  }

  let reply;
  if (PATIENT_EMERGENCY_PATTERNS.some((pattern) => message.toLowerCase().includes(pattern))) {
    const emergency = PATIENT_EMERGENCY[language];
    reply = {
      message: emergency.message,
      urgency: "EMERGENCY",
      followUpQuestions: [],
      recommendations: emergency.recommendations,
      recommendedSpecialty: "",
      disclaimer: PATIENT_DISCLAIMER,
    };
  } else {
    try {
      reply = await askPatientModel({
        message,
        patientContext: payload?.patientContext ?? {},
        language,
        images,
        retry: false,
      });
      if (language === "am" && !ETHIOPIC.test(reply.message)) {
        reply = await askPatientModel({
          message,
          patientContext: payload?.patientContext ?? {},
          language,
          images,
          retry: true,
        });
      }
      if (language === "am" && !ETHIOPIC.test(reply.message)) {
        reply = {
          message: AMHARIC_UNAVAILABLE.message,
          urgency: "INFORMATIONAL",
          followUpQuestions: [],
          recommendations: AMHARIC_UNAVAILABLE.recommendations,
          recommendedSpecialty: "",
          disclaimer: PATIENT_DISCLAIMER,
        };
      }
    } catch (error) {
      const failure = error && error.payload ? error : providerError(502, "");
      sendJson(res, failure.status, failure.payload);
      return;
    }
  }

  const patientMessage = {
    id: `msg-${randomUUID().slice(0, 8)}`,
    conversationId: conversation.id,
    role: "PATIENT",
    content: message,
    attachments: images.map((image) => ({
      id: image.id,
      fileName: image.fileName,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      previewUrl: "",
    })),
    isMock: false,
    createdAt: now,
  };
  const assistantMessage = {
    id: `msg-${randomUUID().slice(0, 8)}`,
    conversationId: conversation.id,
    role: "ASSISTANT",
    content: reply.message,
    attachments: [],
    urgency: reply.urgency,
    followUpQuestions: reply.followUpQuestions,
    recommendations: reply.recommendations,
    disclaimer: reply.disclaimer,
    recommendedDoctorIds: [],
    recommendedHospitalIds: [],
    isMock: false,
    createdAt: new Date().toISOString(),
  };

  if (conversation.messages.length === 0) {
    conversation.title = message.replace(/\s+/g, " ").slice(0, 60) || "Image consultation";
  }
  conversation.messages.push(patientMessage, assistantMessage);
  conversation.updatedAt = assistantMessage.createdAt;

  sendJson(res, 200, { ...reply, conversationId: conversation.id, isMock: false });
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === "/api/ai/status" && req.method === "GET") {
      sendJson(res, 200, {
        configured: Boolean(API_KEY),
        provider: new URL(BASE_URL).host,
        chatModel: API_KEY ? CHAT_MODEL : null,
        transcribeModel: API_KEY ? TRANSCRIBE_MODEL : null,
        languages: ["en", "am"],
        maxAudioBytes: MAX_AUDIO_BYTES,
        missingEnv: API_KEY ? [] : ["AI_API_KEY"],
      });
      return;
    }

    if (url.pathname === "/api/ai/clinical" && req.method === "POST") {
      await handleClinical(req, res);
      return;
    }

    if (url.pathname === "/api/ai/transcribe" && req.method === "POST") {
      await handleTranscribe(req, res);
      return;
    }

    if (url.pathname === "/api/ai/images" && req.method === "POST") {
      await handlePatientImage(req, res);
      return;
    }

    if (url.pathname === "/api/ai/health-assistant/messages" && req.method === "POST") {
      await handlePatientMessage(req, res);
      return;
    }

    if (url.pathname === "/api/ai/patient-advice" && req.method === "POST") {
      await handlePatientAdvice(req, res);
      return;
    }

    if (url.pathname === "/api/ai/conversations" && req.method === "GET") {
      const patientId = url.searchParams.get("patientId") ?? "";
      const rows = [...patientConversations.values()]
        .filter((conversation) => conversation.patientId === patientId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(hydrateConversation);
      sendJson(res, 200, rows);
      return;
    }

    if (url.pathname === "/api/ai/conversations" && req.method === "POST") {
      const body = await readBody(req, 64 * 1024);
      let payload;
      try {
        payload = JSON.parse(body.toString("utf8"));
      } catch {
        sendJson(res, 400, { message: "Invalid JSON body." });
        return;
      }
      const now = new Date().toISOString();
      const conversation = {
        id: `cnv-${randomUUID().slice(0, 8)}`,
        patientId: String(payload?.patientId ?? ""),
        title: "New conversation",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      patientConversations.set(conversation.id, conversation);
      sendJson(res, 201, conversation);
      return;
    }

    if (
      url.pathname.startsWith("/api/ai/conversations/") &&
      req.method === "GET"
    ) {
      const id = url.pathname.slice("/api/ai/conversations/".length);
      const conversation = patientConversations.get(id);
      if (!conversation) {
        sendJson(res, 404, { message: "This conversation is no longer available." });
        return;
      }
      sendJson(res, 200, hydrateConversation(conversation));
      return;
    }

    sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected gateway failure.";
    const status = /exceeds/.test(message) ? 413 : 502;
    sendJson(res, status, { error: message });
  } finally {
    // Operational log only — never the request body or patient data.
    console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MyHealth AI gateway listening on http://127.0.0.1:${PORT}`);
  console.log(
    API_KEY
      ? `Provider configured · chat=${CHAT_MODEL} · transcribe=${TRANSCRIBE_MODEL}`
      : "No AI_API_KEY set — the client will fall back to the labelled demo adapter.",
  );
});
