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

  const contentType = (req.headers["content-type"] ?? "audio/webm").split(";")[0].trim();
  const extension = AUDIO_EXTENSIONS[contentType];
  if (!extension) {
    sendJson(res, 415, {
      error: `Unsupported audio type "${contentType}". Use webm, ogg, m4a, mp3, wav or flac.`,
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
