import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin } from "vite";

import type {
  AccountStatus,
  AIChatMessage,
  AIConversation,
  Appointment,
  AuditAction,
  AuditLog,
  CareUrgency,
  DoctorAvailability,
  Hospital,
  MedicalRecord,
  Payment,
  HospitalApprovalStatus,
  Notification,
  Patient,
  PlatformSettings,
  PlatformUser,
  User,
} from "../src/types";
import { createSeedDatabase, type ApiDatabase } from "./seed";

/* -------------------------------------------------------------------------- */
/*                                  Storage                                   */
/* -------------------------------------------------------------------------- */

const DATA_FILE = fileURLToPath(new URL("./data.json", import.meta.url));

function loadDb(): ApiDatabase {
  if (!existsSync(DATA_FILE)) {
    const seeded = createSeedDatabase();
    saveDb(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as ApiDatabase;
    const seed = createSeedDatabase();
    // Preserve data, but back-fill collections added by a newer release.
    return { ...seed, ...parsed };
  } catch {
    const seeded = createSeedDatabase();
    saveDb(seeded);
    return seeded;
  }
}

function saveDb(next: ApiDatabase) {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const temp = `${DATA_FILE}.tmp`;
  writeFileSync(temp, JSON.stringify(next, null, 2), "utf8");
  renameSync(temp, DATA_FILE);
}

const db: ApiDatabase = loadDb();

function persist() {
  saveDb(db);
}

/* -------------------------------------------------------------------------- */
/*                                 Sessions                                   */
/* -------------------------------------------------------------------------- */

interface Session {
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

function tokenOf(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function currentUser(req: IncomingMessage): User | null {
  const token = tokenOf(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return allUsers().find((user) => user.id === session.userId) ?? null;
}

function requireUser(req: IncomingMessage): User {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, "Your session has ended. Please sign in again.", "SESSION_EXPIRED");
  return user;
}

function requireSuperAdmin(req: IncomingMessage): User {
  const user = requireUser(req);
  if (user.role !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only Super Administrators may perform this action.");
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function allUsers(): User[] {
  return [
    ...db.patients,
    ...db.doctors,
    ...db.hospitalAdmins,
    ...db.superAdmins,
  ];
}

function hospitalOf(user: User): Hospital | undefined {
  const id = "hospitalId" in user ? (user.hospitalId as string) : undefined;
  return id ? db.hospitals.find((hospital) => hospital.id === id) : undefined;
}

function platformUser(user: User): PlatformUser {
  const hospital = hospitalOf(user);
  return {
    ...user,
    hospitalId: hospital?.id,
    hospitalName: hospital?.name,
  };
}

function toAdministrator(admin: ApiDatabase["hospitalAdmins"][number]) {
  return {
    ...admin,
    hospitalName:
      db.hospitals.find((hospital) => hospital.id === admin.hospitalId)?.name ??
      "Unassigned",
  };
}

function nowISO() {
  return new Date().toISOString();
}

function recordAudit(
  actor: User | null,
  input: {
    action: AuditAction;
    entityType: AuditLog["entityType"];
    entityId: string;
    entityLabel: string;
    description: string;
    metadata?: Record<string, string>;
  },
) {
  const entry: AuditLog = {
    id: `aud-${randomUUID()}`,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    description: input.description,
    actorId: actor?.id ?? "system",
    actorName: actor?.fullName ?? "System",
    result: "SUCCESS",
    createdAt: nowISO(),
    metadata: input.metadata,
  };
  db.auditLogs = [entry, ...db.auditLogs];
  return entry;
}

function pushNotification(input: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  const notification: Notification = {
    id: `ntf-${randomUUID()}`,
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: "APPROVAL",
    isRead: false,
    createdAt: nowISO(),
    link: input.link,
  };
  db.notifications = [notification, ...db.notifications];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function flag(value: unknown) {
  return value === true;
}

/* -------------------------------------------------------------------------- */
/*                             AI health assistant                            */
/* -------------------------------------------------------------------------- */

interface StoredImage {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  uploadedAt: number;
}

/** Uploaded images live in memory only: never written to data.json or disk. */
const images = new Map<string, StoredImage>();
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_TTL_MS = 2 * 60 * 60 * 1000;

const EMERGENCY_PATTERNS = [
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

const ETHIOPIC_SCRIPT = /[\u1200-\u137F]/;
const CARE_URGENCIES: CareUrgency[] = [
  "EMERGENCY",
  "URGENT",
  "ROUTINE",
  "INFORMATIONAL",
];

const AI_DISCLAIMER =
  "This is general health information from MyHealth, not a diagnosis or a prescription. A qualified clinician must assess your symptoms.";

const EMERGENCY_REPLY: Record<
  "en" | "am",
  { message: string; recommendations: string[] }
> = {
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

const SYSTEM_PROMPT = `You are the MyHealth medical guidance assistant. You provide general health information and healthcare navigation only.
Hard rules:
- Never diagnose a condition or claim certainty.
- Never prescribe medication, suggest doses, or advise stopping/changing a prescription.
- Never claim an image confirms or rules out a condition.
- If symptoms could be life-threatening, set urgency to "EMERGENCY" and tell the patient to contact emergency services immediately.
- Be calm, plain and concise. No markdown headings. No promises.
- Use the patient context only when it is provided; never invent missing values.
- Write every string in the same language as the patient's latest message: English or Amharic (አማርኛ). Never answer in a different language.
Return ONLY a JSON object with this shape:
{"message":"string","urgency":"EMERGENCY|URGENT|ROUTINE|INFORMATIONAL","followUpQuestions":["..."],"recommendations":["..."],"recommendedSpecialty":"a medical specialty or empty string","disclaimer":"string"}`;

interface AIConfig {
  key: string;
  base: string;
  model: string;
  timeoutMs: number;
}

let aiConfigCache: AIConfig | null = null;

/** Server-side AI settings. The key comes from `.env`, never the bundle. */
function aiConfig(): AIConfig {
  if (aiConfigCache) return aiConfigCache;
  let env: Record<string, string> = {};
  try {
    const mode =
      process.env.NODE_ENV === "production" ? "production" : "development";
    env = loadEnv(mode, process.cwd(), "");
  } catch {
    env = {};
  }
  const pick = (name: string) => env[name] || process.env[name] || "";
  aiConfigCache = {
    key: pick("ZAI_API_KEY") || pick("OPENAI_API_KEY"),
    base: (
      pick("ZAI_API_BASE") ||
      pick("OPENAI_BASE_URL") ||
      "https://api.z.ai/api/paas/v4"
    ).replace(/\/+$/, ""),
    model: pick("ZAI_MODEL") || pick("OPENAI_MODEL") || "glm-4.6v-flash",
    timeoutMs: Number(pick("AI_TIMEOUT_MS")) || 90_000,
  };
  return aiConfigCache;
}

function isEmergency(value: string) {
  const lower = value.toLowerCase();
  return EMERGENCY_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** Ethiopic script signals Amharic; otherwise the explicit choice wins. */
function detectLanguage(message: string, requested: string): "en" | "am" {
  if (ETHIOPIC_SCRIPT.test(message)) return "am";
  if (requested === "am" || requested === "en") return requested;
  return "en";
}

function languageName(language: "en" | "am") {
  return language === "am" ? "Amharic (አማርኛ)" : "English";
}

function buildUserText(input: {
  message: string;
  patientContext: unknown;
  language: "en" | "am";
  hasImages: boolean;
}) {
  const hasContext =
    input.patientContext !== null &&
    typeof input.patientContext === "object" &&
    Object.keys(input.patientContext as Record<string, unknown>).length > 0;
  const context = hasContext
    ? `Patient context (saved by the patient, may be incomplete): ${JSON.stringify(input.patientContext)}`
    : "No patient context was provided. Do not invent any.";
  return [
    `Reply language: ${languageName(input.language)}. Every string you return must be in that language.`,
    context,
    input.hasImages
      ? "The patient attached one or more images. They may help describe the visible area, but they cannot confirm a condition."
      : "",
    `Patient message: ${input.message || "(no text, image only)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function recommendationsFor(specialty: string) {
  const match = db.doctors.filter(
    (doctor) => doctor.specialty === specialty && doctor.isAcceptingPatients,
  );
  return {
    doctorIds: match.map((doctor) => doctor.id),
    hospitalIds: [...new Set(match.map((doctor) => doctor.hospitalId))],
  };
}

async function callAIProvider(payload: unknown): Promise<Record<string, unknown>> {
  const config = aiConfig();
  if (!config.key) {
    throw new HttpError(
      503,
      "The medical AI is not configured yet. Add ZAI_API_KEY to .env and restart the dev server.",
      "AI_NOT_CONFIGURED",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${config.base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new HttpError(
            504,
            "The medical AI took too long to answer. Please try again.",
            "AI_TIMEOUT",
          );
        }
        console.error(
          "AI request failed",
          error instanceof Error ? error.message : error,
        );
        throw new HttpError(
          502,
          "The medical AI service could not answer right now.",
          "AI_UNAVAILABLE",
        );
      }

      if (response.ok) {
        return (await response.json()) as Record<string, unknown>;
      }

      const detail = await response.text().catch(() => "");
      console.error("AI provider error", response.status, detail.slice(0, 500));

      // The free tier rate-limits bursts: wait once, then explain plainly.
      if (response.status === 429) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5_000));
          continue;
        }
        throw new HttpError(
          503,
          "The free AI tier is busy right now. Wait a minute and try again.",
          "AI_BUSY",
        );
      }
      throw new HttpError(
        502,
        "The medical AI service could not answer right now.",
        "AI_UNAVAILABLE",
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

const LANGUAGE_RULE: Record<"en" | "am", string> = {
  en: "The patient wrote in English. Write every returned string in English.",
  am: "አስፈላጊ፡ ሁሉንም መልስ በአማርኛ ብቻ በኢትዮጵያ ፊደል ይጻፉ። IMPORTANT: every returned string must be written in Amharic (አማርኛ) using Ethiopic script. Do not write English sentences.",
};

async function askModel(
  userContent: Array<Record<string, unknown>>,
  language: "en" | "am",
  isRetry = false,
) {
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: `${LANGUAGE_RULE[language]}\n\n${SYSTEM_PROMPT}` },
    { role: "user", content: userContent },
  ];
  if (isRetry) {
    messages.push({
      role: "system",
      content:
        "Your previous draft was rejected because it was not in Amharic. Rewrite every string in Amharic using Ethiopic script. Do not use English.",
    });
  }

  const data = await callAIProvider({
    model: aiConfig().model,
    temperature: isRetry ? 0.1 : 0.2,
    response_format: { type: "json_object" },
    messages,
  });

  const choices = (
    data as { choices?: Array<{ message?: { content?: string } }> }
  ).choices;
  const raw = choices?.[0]?.message?.content ?? "";
  return { raw, parsed: extractJson(raw) ?? {} };
}

function replyText(raw: string, parsed: Record<string, unknown>) {
  return typeof parsed.message === "string" && parsed.message.trim()
    ? parsed.message.trim()
    : raw.trim();
}

/**
 * The free GLM vision model reasons well in English but produces incoherent
 * Amharic. Rather than return garbled or English medical guidance, tell an
 * Amharic-speaking patient plainly and safely that the answer must be
 * requested in English until a funded Amharic-capable model is configured
 * (ZAI_MODEL, for example a glm-4.6 text model with credit).
 */
const AMHARIC_UNAVAILABLE = {
  message:
    "ይቅርታ፣ አሁን ስለዚህ ጉዳይ ትክክለኛ መልስ በአማርኛ መስጠት አልተቻለም። እባክዎ በእንግሊዝኛ እንደገና ይጠይቁ ወይም በኋላ ይሞክሩ። ምልክቶቹ አሳሳቢ ከሆኑ ወዲያውኑ ሐኪም ያማክሩ።",
  recommendations: [
    "ምልክቶቹ አሳሳቢ ከሆኑ ወዲያውኑ ሐኪም ያማክሩ።",
    "ትክክለኛ መልስ ለማግኘት በእንግሊዝኛ እንደገና ይጠይቁ።",
  ],
};

async function generateAIReply(input: {
  message: string;
  patientContext: unknown;
  language: "en" | "am";
  imageIds: string[];
}) {
  const language = input.language;
  if (isEmergency(input.message)) {
    const reply = EMERGENCY_REPLY[language];
    return {
      message: reply.message,
      urgency: "EMERGENCY" as CareUrgency,
      followUpQuestions: [] as string[],
      recommendations: reply.recommendations,
      recommendedDoctorIds: [] as string[],
      recommendedHospitalIds: [] as string[],
      disclaimer: AI_DISCLAIMER,
    };
  }

  const providerImages = input.imageIds
    .map((id) => images.get(id))
    .filter((image): image is StoredImage => Boolean(image));

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: buildUserText({
        message: input.message,
        patientContext: input.patientContext,
        language,
        hasImages: providerImages.length > 0,
      }),
    },
  ];
  providerImages.forEach((image) => {
    userContent.push({ type: "image_url", image_url: { url: image.dataUrl } });
  });

  let { raw, parsed } = await askModel(userContent, language);
  const isAmharic = language === "am";

  // The free vision model occasionally ignores the language rule. Retry once
  // with a corrective instruction so an Amharic patient never gets English.
  if (isAmharic && !ETHIOPIC_SCRIPT.test(replyText(raw, parsed))) {
    ({ raw, parsed } = await askModel(userContent, language, true));
  }
  if (isAmharic && !ETHIOPIC_SCRIPT.test(replyText(raw, parsed))) {
    return {
      message: AMHARIC_UNAVAILABLE.message,
      urgency: "INFORMATIONAL" as CareUrgency,
      followUpQuestions: [] as string[],
      recommendations: AMHARIC_UNAVAILABLE.recommendations,
      recommendedDoctorIds: [] as string[],
      recommendedHospitalIds: [] as string[],
      disclaimer: AI_DISCLAIMER,
    };
  }

  const urgency = CARE_URGENCIES.includes(parsed.urgency as CareUrgency)
    ? (parsed.urgency as CareUrgency)
    : "ROUTINE";
  const specialty =
    typeof parsed.recommendedSpecialty === "string"
      ? parsed.recommendedSpecialty
      : "";
  const recommended = recommendationsFor(specialty);

  return {
    message: replyText(raw, parsed),
    urgency,
    followUpQuestions: Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 4).map(String)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 5).map(String)
      : [],
    recommendedDoctorIds: recommended.doctorIds,
    recommendedHospitalIds: recommended.hospitalIds,
    disclaimer: AI_DISCLAIMER,
  };
}

function pruneImages() {
  const cutoff = Date.now() - IMAGE_TTL_MS;
  for (const [id, image] of images) {
    if (image.uploadedAt < cutoff) images.delete(id);
  }
}

function hydrateConversation(conversation: AIConversation): AIConversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      attachments: (message.attachments ?? []).map((attachment) => ({
        ...attachment,
        previewUrl: images.get(attachment.id)?.dataUrl ?? "",
      })),
    })),
  };
}

function assertPatient(user: User, patientId: string) {
  if (!patientId || user.id !== patientId) {
    throw new HttpError(
      403,
      "You do not have access to this conversation.",
      "FORBIDDEN",
    );
  }
}

/** Image bytes stay out of data.json: only attachment metadata is stored. */
function persistableMessage(message: AIChatMessage): AIChatMessage {
  return {
    ...message,
    attachments: message.attachments.map((attachment) => ({
      ...attachment,
      previewUrl: "",
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                             Clinical helpers                               */
/* -------------------------------------------------------------------------- */

function uid(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function appointmentMatches(appointment: Appointment, params: URLSearchParams) {
  const patientId = params.get("patientId");
  const doctorId = params.get("doctorId");
  const hospitalId = params.get("hospitalId");
  const status = params.get("status");
  const date = params.get("date");
  if (patientId && appointment.patientId !== patientId) return false;
  if (doctorId && appointment.doctorId !== doctorId) return false;
  if (hospitalId && appointment.hospitalId !== hospitalId) return false;
  if (status && appointment.status !== status) return false;
  if (date && appointment.date !== date) return false;
  return true;
}

const sortAppointments = (a: Appointment, b: Appointment) =>
  `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);

function detailedAppointment(appointment: Appointment) {
  const patient = db.patients.find((item) => item.id === appointment.patientId);
  const doctor = db.doctors.find((item) => item.id === appointment.doctorId);
  const hospital = db.hospitals.find((item) => item.id === appointment.hospitalId);
  const payment = db.payments.find(
    (item) => item.appointmentId === appointment.id,
  );
  return {
    ...appointment,
    patientName: patient?.fullName ?? "Unknown patient",
    doctorName: doctor?.fullName ?? "Unknown doctor",
    doctorSpecialty: doctor?.specialty ?? "General Medicine",
    hospitalName: hospital?.name ?? "Unknown hospital",
    paymentStatus: payment?.status,
    paymentMethod: payment?.method,
  };
}

function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: Notification["type"],
  link: string,
) {
  db.notifications = [
    {
      id: uid("ntf"),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: nowISO(),
      link,
    },
    ...db.notifications,
  ];
}

/* -------------------------------------------------------------------------- */
/*                                  Router                                    */
/* -------------------------------------------------------------------------- */

type Body = Record<string, unknown>;

async function readBody(req: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Body;
  } catch {
    return {};
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);
  const body = method === "GET" || method === "HEAD" ? {} : await readBody(req);
  const [root, second, third, fourth] = segments;

  /* ------------------------------- Auth ---------------------------------- */

  if (root === "auth") {
    if (second === "login" && method === "POST") {
      const email = text(body.email).trim().toLowerCase();
      const password = text(body.password);
      const user = allUsers().find((item) => item.email.toLowerCase() === email);
      const credential = db.credentials.find(
        (item) => item.email.toLowerCase() === email,
      );
      if (!user || !credential || credential.password !== password) {
        throw new HttpError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
      }

      const status = user.status ?? "ACTIVE";
      if (status === "PENDING") {
        throw new HttpError(403, "Your account is awaiting approval.", "ACCOUNT_PENDING");
      }
      if (status === "SUSPENDED") {
        throw new HttpError(403, "This account has been suspended.", "ACCOUNT_SUSPENDED");
      }
      if (status === "DISABLED") {
        throw new HttpError(403, "This account has been disabled.", "ACCOUNT_DISABLED");
      }
      const hospital = hospitalOf(user);
      if (hospital && hospital.approvalStatus !== "APPROVED") {
        throw new HttpError(
          403,
          `${hospital.name} is currently ${hospital.approvalStatus.toLowerCase()} on MyHealth.`,
          `HOSPITAL_${hospital.approvalStatus}`,
        );
      }

      const remember = body.remember !== false;
      const token = randomUUID();
      const ttl = (remember ? 8 * 60 : 60) * 60_000;
      sessions.set(token, { userId: user.id, expiresAt: Date.now() + ttl });

      return send(res, 200, {
        user,
        token,
        hospitalId: hospital?.id,
        expiresAt: new Date(Date.now() + ttl).toISOString(),
      });
    }

    if (second === "logout" && method === "POST") {
      const token = tokenOf(req);
      if (token) sessions.delete(token);
      return send(res, 200, {});
    }

    if (second === "me" && method === "GET") {
      return send(res, 200, requireUser(req));
    }

    if (second === "register" && method === "POST") {
      const email = text(body.email).trim().toLowerCase();
      if (!flag(body.acceptedTerms) || !flag(body.acceptedPrivacy)) {
        throw new HttpError(
          400,
          "You must accept the terms of service and the privacy notice to create an account.",
          "CONSENT_REQUIRED",
        );
      }
      if (allUsers().some((item) => item.email.toLowerCase() === email)) {
        throw new HttpError(409, "An account with this email address already exists.", "EMAIL_TAKEN");
      }
      const user: Patient = {
        id: `pat-${randomUUID().slice(0, 8)}`,
        email,
        fullName: text(body.fullName).trim(),
        role: "PATIENT",
        phone: text(body.phone).trim(),
        dateOfBirth: text(body.dateOfBirth) || undefined,
        gender: body.gender as Patient["gender"],
        age: typeof body.age === "number" ? body.age : undefined,
        weightKg: typeof body.weightKg === "number" ? body.weightKg : undefined,
        heightCm: typeof body.heightCm === "number" ? body.heightCm : undefined,
        medicalHistory: text(body.medicalHistory) || undefined,
        allergies: text(body.allergies) || undefined,
        currentMedications: text(body.currentMedications) || undefined,
        status: "ACTIVE",
        createdAt: nowISO(),
      };
      db.patients = [...db.patients, user];
      db.credentials = [
        ...db.credentials,
        { userId: user.id, email, password: text(body.password) },
      ];
      persist();
      return send(res, 201, { user, requiresVerification: false });
    }

    if (second === "forgot-password" && method === "POST") {
      const email = text(body.email).trim().toLowerCase();
      const user = allUsers().find((item) => item.email.toLowerCase() === email);
      if (user) {
        const token = randomUUID();
        const createdAt = new Date();
        db.passwordResets = [
          ...db.passwordResets,
          {
            token,
            userId: user.id,
            createdAt: createdAt.toISOString(),
            expiresAt: new Date(createdAt.getTime() + 60 * 60_000).toISOString(),
          },
        ];
        persist();
        // A production deployment sends this token by email; never in the response.
      }
      return send(res, 200, {});
    }

    if (second === "reset-password" && method === "POST") {
      const token = text(body.token);
      const reset = db.passwordResets.find((item) => item.token === token);
      if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) {
        throw new HttpError(
          400,
          "This reset link is invalid or has expired. Request a new one.",
          "RESET_TOKEN_INVALID",
        );
      }
      const credential = db.credentials.find(
        (item) => item.userId === reset.userId,
      );
      if (!credential) {
        throw new HttpError(400, "This reset link is invalid.", "RESET_TOKEN_INVALID");
      }
      credential.password = text(body.newPassword);
      db.passwordResets = db.passwordResets.filter(
        (item) => item.userId !== reset.userId,
      );
      persist();
      return send(res, 200, {});
    }
  }

  /* ----------------------------- Hospitals -------------------------------- */

  if (root === "hospitals") {
    if (!second && method === "GET") {
      const approvalStatus = url.searchParams.get("approvalStatus");
      const city = url.searchParams.get("city");
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const hospitals = db.hospitals.filter((hospital) => {
        if (approvalStatus && hospital.approvalStatus !== approvalStatus) return false;
        if (city && hospital.city !== city) return false;
        if (
          search &&
          !`${hospital.name} ${hospital.city}`.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      });
      return send(res, 200, hospitals);
    }

    if (second && !third) {
      const hospital = db.hospitals.find((item) => item.id === second);
      if (!hospital) throw new HttpError(404, "Hospital not found.");
      if (method === "GET") return send(res, 200, hospital);
      if (method === "PATCH") {
        requireSuperAdmin(req);
        Object.assign(hospital, body);
        persist();
        return send(res, 200, hospital);
      }
    }

    if (second && third === "approval" && method === "PATCH") {
      const actor = requireSuperAdmin(req);
      const hospital = db.hospitals.find((item) => item.id === second);
      if (!hospital) throw new HttpError(404, "Hospital not found.");

      const status = text(body.status) as HospitalApprovalStatus;
      const reason = text(body.reason).trim();
      const previous = hospital.approvalStatus;

      if (status === "REJECTED" || status === "SUSPENDED") {
        if (!reason || reason.length < 10) {
          throw new HttpError(400, "Please provide a reason of at least 10 characters.");
        }
      }

      hospital.approvalStatus = status;
      hospital.isVerified = status === "APPROVED";
      if (status === "APPROVED") {
        hospital.reviewedAt = nowISO();
        hospital.rejectionReason = undefined;
        hospital.suspensionReason = undefined;
      }
      if (status === "REJECTED") {
        hospital.reviewedAt = nowISO();
        hospital.rejectionReason = reason;
      }
      if (status === "SUSPENDED") {
        hospital.suspensionReason = reason;
      }

      const action: AuditAction =
        status === "APPROVED"
          ? body.reactivate
            ? "HOSPITAL_REACTIVATED"
            : "HOSPITAL_APPROVED"
          : status === "REJECTED"
            ? "HOSPITAL_REJECTED"
            : "HOSPITAL_SUSPENDED";

      recordAudit(actor, {
        action,
        entityType: "HOSPITAL",
        entityId: hospital.id,
        entityLabel: hospital.name,
        description: `Hospital status changed from ${previous} to ${status}.`,
        metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
      });

      const admin = db.hospitalAdmins.find(
        (item) => item.hospitalId === hospital.id,
      );
      if (admin) {
        pushNotification({
          userId: admin.id,
          title: `Hospital ${status.toLowerCase()}`,
          message: `${hospital.name} was ${status.toLowerCase()} by the platform team.`,
          link: "/hospital-admin/profile",
        });
      }
      persist();
      return send(res, 200, hospital);
    }
  }

  /* ------------------------------- Doctors -------------------------------- */

  if (root === "doctors" && method === "GET") {
    if (!second) {
      const hospitalId = url.searchParams.get("hospitalId");
      const specialty = url.searchParams.get("specialty");
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      return send(
        res,
        200,
        db.doctors.filter((doctor) => {
          if (hospitalId && doctor.hospitalId !== hospitalId) return false;
          if (specialty && doctor.specialty !== specialty) return false;
          if (
            search &&
            !`${doctor.fullName} ${doctor.specialty}`.toLowerCase().includes(search)
          ) {
            return false;
          }
          return true;
        }),
      );
    }
    if (second === "me") {
      const userId = url.searchParams.get("userId");
      return send(res, 200, db.doctors.find((doctor) => doctor.id === userId) ?? null);
    }
    if (second && third === "availability" && method === "GET") {
      return send(
        res,
        200,
        db.availability.filter((slot) => slot.doctorId === second),
      );
    }
    const doctor = db.doctors.find((item) => item.id === second);
    if (!doctor) throw new HttpError(404, "Doctor not found.");
    return send(res, 200, doctor);
  }

  /* ----------------------------- Availability ----------------------------- */

  if (root === "availability") {
    if (method === "POST") {
      const slot: DoctorAvailability = {
        id: uid("avl"),
        doctorId: text(body.doctorId),
        hospitalId: text(body.hospitalId),
        dayOfWeek: body.dayOfWeek as DoctorAvailability["dayOfWeek"],
        startTime: text(body.startTime),
        endTime: text(body.endTime),
        slotDurationMinutes: Number(body.slotDurationMinutes) || 30,
        isActive: body.isActive !== false,
      };
      db.availability = [...db.availability, slot];
      persist();
      return send(res, 201, slot);
    }

    if (second && method === "PATCH") {
      const slot = db.availability.find((item) => item.id === second);
      if (!slot) throw new HttpError(404, "Availability not found.");
      Object.assign(slot, body);
      persist();
      return send(res, 200, slot);
    }

    if (second && method === "DELETE") {
      db.availability = db.availability.filter((item) => item.id !== second);
      persist();
      return send(res, 200, {});
    }
  }

  /* ------------------------------- Patients ------------------------------- */

  if (root === "patients") {
    if (!second && method === "GET") return send(res, 200, db.patients);
    if (second === "me" && method === "GET") {
      const userId = url.searchParams.get("userId");
      return send(res, 200, db.patients.find((patient) => patient.id === userId) ?? null);
    }
    const patient = db.patients.find((item) => item.id === second);
    if (!patient) throw new HttpError(404, "Patient not found.");
    if (method === "GET") return send(res, 200, patient);
    if (method === "PATCH") {
      const allowed = [
        "fullName",
        "phone",
        "address",
        "emergencyContact",
        "bloodType",
        "dateOfBirth",
        "gender",
      ] as const;
      for (const key of allowed) {
        if (key in body) {
          (patient as unknown as Record<string, unknown>)[key] = body[key];
        }
      }
      persist();
      return send(res, 200, patient);
    }
  }

  /* --------------------------- Platform admin ----------------------------- */

  if (root === "admin") {
    if (second === "users") {
      const actor = requireSuperAdmin(req);
      if (!third && method === "GET") {
        const role = url.searchParams.get("role");
        const status = url.searchParams.get("status");
        const hospitalId = url.searchParams.get("hospitalId");
        const search = url.searchParams.get("search")?.toLowerCase() ?? "";
        const users = allUsers()
          .filter((user) => {
            if (role && user.role !== role) return false;
            if (status && (user.status ?? "ACTIVE") !== status) return false;
            if (hospitalId && hospitalOf(user)?.id !== hospitalId) return false;
            if (
              search &&
              !`${user.fullName} ${user.email} ${user.id}`
                .toLowerCase()
                .includes(search)
            ) {
              return false;
            }
            return true;
          })
          .map(platformUser)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return send(res, 200, users);
      }
      if (third === "me") return send(res, 200, platformUser(actor));

      if (third && fourth === "status" && method === "PATCH") {
        const target = allUsers().find((user) => user.id === third);
        if (!target) throw new HttpError(404, "User account not found.");
        if (target.id === actor.id) {
          throw new HttpError(403, "You cannot change the status of your own account.");
        }
        if (target.role === "SUPER_ADMIN") {
          throw new HttpError(
            403,
            "Super Administrator accounts are managed through secure provisioning, not this screen.",
          );
        }
        const status = text(body.status) as AccountStatus;
        const reason = text(body.reason).trim();
        if ((status === "SUSPENDED" || status === "DISABLED") && !reason) {
          throw new HttpError(
            400,
            "A reason is required when suspending or disabling an account.",
          );
        }
        const previous = target.status ?? "ACTIVE";
        target.status = status;
        recordAudit(actor, {
          action: "USER_STATUS_CHANGED",
          entityType: "USER",
          entityId: target.id,
          entityLabel: target.fullName,
          description: `Account status changed from ${previous} to ${status}.`,
          metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
        });
        persist();
        return send(res, 200, platformUser(target));
      }

      if (third && method === "GET") {
        const target = allUsers().find((user) => user.id === third);
        if (!target) throw new HttpError(404, "User account not found.");
        return send(res, 200, platformUser(target));
      }
    }

    if (second === "administrators") {
      const actor = requireSuperAdmin(req);
      if (!third && method === "GET") {
        const status = url.searchParams.get("status");
        const hospitalId = url.searchParams.get("hospitalId");
        const search = url.searchParams.get("search")?.toLowerCase() ?? "";
        return send(
          res,
          200,
          db.hospitalAdmins
            .filter((admin) => {
              if (status && (admin.status ?? "ACTIVE") !== status) return false;
              if (hospitalId && admin.hospitalId !== hospitalId) return false;
              if (
                search &&
                !`${admin.fullName} ${admin.email} ${toAdministrator(admin).hospitalName}`
                  .toLowerCase()
                  .includes(search)
              ) {
                return false;
              }
              return true;
            })
            .map(toAdministrator)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      }

      if (third === "invite" && method === "POST") {
        const email = text(body.email).trim().toLowerCase();
        if (allUsers().some((user) => user.email.toLowerCase() === email)) {
          throw new HttpError(409, "An account with this email address already exists.");
        }
        const hospital = db.hospitals.find((item) => item.id === text(body.hospitalId));
        if (!hospital) throw new HttpError(404, "Hospital not found.");
        if (hospital.approvalStatus !== "APPROVED") {
          throw new HttpError(400, "Administrators can only be assigned to an approved hospital.");
        }
        const temporaryPassword = `Mh-${randomUUID().slice(0, 8)}`;
        const administrator = {
          id: `adm-${randomUUID().slice(0, 8)}`,
          email,
          fullName: text(body.fullName).trim(),
          role: "HOSPITAL_ADMIN" as const,
          phone: text(body.phone).trim() || undefined,
          hospitalId: hospital.id,
          status: "PENDING" as const,
          createdAt: nowISO(),
        };
        db.hospitalAdmins = [...db.hospitalAdmins, administrator];
        db.credentials = [
          ...db.credentials,
          { userId: administrator.id, email, password: temporaryPassword },
        ];
        recordAudit(actor, {
          action: "ADMINISTRATOR_INVITED",
          entityType: "USER",
          entityId: administrator.id,
          entityLabel: administrator.fullName,
          description: `Administrator invited to ${hospital.name}.`,
          metadata: { hospital: hospital.name },
        });
        persist();
        return send(res, 201, { administrator, temporaryPassword });
      }

      const admin = db.hospitalAdmins.find((item) => item.id === third);
      if (!admin) throw new HttpError(404, "Administrator not found.");

      if (fourth === "hospital" && method === "PATCH") {
        const hospital = db.hospitals.find((item) => item.id === text(body.hospitalId));
        if (!hospital) throw new HttpError(404, "Hospital not found.");
        if (hospital.approvalStatus !== "APPROVED") {
          throw new HttpError(400, "Administrators can only be assigned to an approved hospital.");
        }
        const previous = hospitalOf(admin)?.name ?? "unassigned";
        admin.hospitalId = hospital.id;
        recordAudit(actor, {
          action: "ADMINISTRATOR_REASSIGNED",
          entityType: "USER",
          entityId: admin.id,
          entityLabel: admin.fullName,
          description: `Administrator reassigned from ${previous} to ${hospital.name}.`,
        });
        persist();
        return send(res, 200, toAdministrator(admin));
      }

      if (fourth === "status" && method === "PATCH") {
        if (admin.id === actor.id) {
          throw new HttpError(403, "You cannot change the status of your own account.");
        }
        const status = text(body.status) as AccountStatus;
        const reason = text(body.reason).trim();
        if ((status === "SUSPENDED" || status === "DISABLED") && !reason) {
          throw new HttpError(400, "A reason is required when suspending or disabling an account.");
        }
        const previous = admin.status ?? "ACTIVE";
        admin.status = status;
        recordAudit(actor, {
          action: "USER_STATUS_CHANGED",
          entityType: "USER",
          entityId: admin.id,
          entityLabel: admin.fullName,
          description: `Administrator status changed from ${previous} to ${status}.`,
          metadata: { from: previous, to: status, ...(reason ? { reason } : {}) },
        });
        persist();
        return send(res, 200, toAdministrator(admin));
      }

      if (method === "GET") return send(res, 200, toAdministrator(admin));
    }

    if (second === "audit-logs" && method === "GET") {
      requireSuperAdmin(req);
      const action = url.searchParams.get("action");
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
      const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;
      const logs = db.auditLogs
        .filter((log) => {
          if (action && log.action !== action) return false;
          const created = new Date(log.createdAt).getTime();
          if (fromTime !== null && created < fromTime) return false;
          if (toTime !== null && created > toTime) return false;
          if (
            search &&
            !`${log.action} ${log.description} ${log.actorName} ${log.entityLabel}`
              .toLowerCase()
              .includes(search)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, logs);
    }

    if (second === "analytics") {
      requireSuperAdmin(req);
      if (third === "summary" && method === "GET") {
        const today = new Date().toISOString().slice(0, 10);
        const count = (status: HospitalApprovalStatus) =>
          db.hospitals.filter((hospital) => hospital.approvalStatus === status).length;
        return send(res, 200, {
          totalHospitals: db.hospitals.length,
          approvedHospitals: count("APPROVED"),
          pendingHospitals: count("PENDING"),
          rejectedHospitals: count("REJECTED"),
          suspendedHospitals: count("SUSPENDED"),
          totalUsers: allUsers().length,
          totalPatients: db.patients.length,
          totalDoctors: db.doctors.length,
          totalAdministrators: db.hospitalAdmins.length,
          totalSuperAdmins: db.superAdmins.length,
          totalAppointments: db.appointments.length,
          completedAppointments: db.appointments.filter(
            (appointment) => appointment.status === "COMPLETED",
          ).length,
          cancelledAppointments: db.appointments.filter(
            (appointment) => appointment.status === "CANCELLED",
          ).length,
          upcomingAppointments: db.appointments.filter(
            (appointment) =>
              appointment.status === "BOOKED" && appointment.date >= today,
          ).length,
        });
      }

      if (third === "growth" && method === "GET") {
        const range = url.searchParams.get("range") ?? "30d";
        const now = new Date();
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const end = url.searchParams.get("to")
          ? new Date(`${url.searchParams.get("to")}T23:59:59`)
          : now;
        const start =
          range === "custom" && url.searchParams.get("from")
            ? new Date(`${url.searchParams.get("from")}T00:00:00`)
            : new Date(end.getTime() - days * 86_400_000);

        const totalDays = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
        );
        const buckets: { start: number; end: number; label: string }[] = [];
        if (totalDays <= 10) {
          for (let index = 0; index < totalDays; index += 1) {
            const bucketStart = new Date(start.getTime() + index * 86_400_000);
            buckets.push({
              start: bucketStart.getTime(),
              end: bucketStart.getTime() + 86_400_000,
              label: new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
              }).format(bucketStart),
            });
          }
        } else if (totalDays <= 45) {
          for (let cursor = start.getTime(); cursor < end.getTime(); cursor += 7 * 86_400_000) {
            buckets.push({
              start: cursor,
              end: Math.min(cursor + 7 * 86_400_000, end.getTime()),
              label: new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
              }).format(new Date(cursor)),
            });
          }
        } else {
          const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
          while (cursor.getTime() <= end.getTime() && buckets.length < 12) {
            const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            buckets.push({
              start: cursor.getTime(),
              end: next.getTime(),
              label: new Intl.DateTimeFormat("en-GB", {
                month: "short",
                year: "2-digit",
              }).format(cursor),
            });
            cursor.setMonth(cursor.getMonth() + 1);
          }
        }

        const countIn = (items: string[]) =>
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
        const patientsGrowth = countIn(db.patients.map((item) => item.createdAt));
        const doctorsGrowth = countIn(db.doctors.map((item) => item.createdAt));
        const administrators = countIn(
          db.hospitalAdmins.map((item) => item.createdAt),
        );
        const appointments = countIn(db.appointments.map((item) => item.createdAt));

        return send(
          res,
          200,
          buckets.map((bucket, index) => ({
            label: bucket.label,
            hospitals: hospitals[index],
            approvedHospitals: approved[index],
            patients: patientsGrowth[index],
            doctors: doctorsGrowth[index],
            administrators: administrators[index],
            appointments: appointments[index],
          })),
        );
      }
    }

    if (second === "settings") {
      if (method === "GET") {
        requireSuperAdmin(req);
        return send(res, 200, db.settings);
      }
      if (method === "PATCH") {
        const actor = requireSuperAdmin(req);
        db.settings = {
          ...db.settings,
          ...(body as Partial<PlatformSettings>),
          updatedAt: nowISO(),
          updatedBy: actor.fullName,
        };
        recordAudit(actor, {
          action: "SETTINGS_UPDATED",
          entityType: "SETTINGS",
          entityId: "platform",
          entityLabel: "Platform settings",
          description: "Platform configuration was updated.",
        });
        persist();
        return send(res, 200, db.settings);
      }
    }
  }

  /* ----------------------------- Appointments ----------------------------- */

  if (root === "appointments") {
    if (method === "GET" && !second) {
      const rows = db.appointments
        .filter((appointment) => appointmentMatches(appointment, url.searchParams))
        .sort(sortAppointments);
      return send(
        res,
        200,
        url.searchParams.get("expand") ? rows.map(detailedAppointment) : rows,
      );
    }

    if (method === "POST" && !second) {
      const doctor = db.doctors.find((item) => item.id === text(body.doctorId));
      const hospital = db.hospitals.find((item) => item.id === text(body.hospitalId));
      const patient = db.patients.find((item) => item.id === text(body.patientId));
      if (!doctor) throw new HttpError(404, "Doctor not found.");
      if (!hospital) throw new HttpError(404, "Hospital not found.");
      if (!patient) throw new HttpError(404, "Patient profile not found.");
      if (hospital.approvalStatus !== "APPROVED") {
        throw new HttpError(
          409,
          "This hospital is not approved to accept appointments.",
        );
      }

      const date = text(body.date);
      const startTime = text(body.startTime);
      const endTime = text(body.endTime);
      const conflict = db.appointments.some(
        (item) =>
          item.doctorId === doctor.id &&
          item.date === date &&
          item.startTime === startTime &&
          item.status !== "CANCELLED",
      );
      if (conflict) {
        throw new HttpError(409, "That time slot is already booked. Choose another.");
      }

      const timestamp = nowISO();
      const methodValue: Payment["method"] =
        body.paymentMethod === "ONLINE" ? "ONLINE" : "PAY_AT_HOSPITAL";
      const payment: Payment = {
        id: uid("pay"),
        appointmentId: uid("apt"),
        patientId: patient.id,
        amount: doctor.consultationFee,
        currency: "ETB",
        method: methodValue,
        status: methodValue === "ONLINE" ? "PENDING" : "UNPAID_AT_HOSPITAL",
        createdAt: timestamp,
      };
      const appointment: Appointment = {
        id: payment.appointmentId,
        patientId: patient.id,
        doctorId: doctor.id,
        hospitalId: hospital.id,
        date,
        startTime,
        endTime,
        status: "BOOKED",
        reason: text(body.reason),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      db.payments = [payment, ...db.payments];
      db.appointments = [appointment, ...db.appointments];
      notifyUser(
        patient.id,
        "Appointment confirmed",
        `Your appointment with ${doctor.fullName} on ${date} at ${startTime} is confirmed.`,
        "APPOINTMENT",
        "/patient/appointments",
      );
      notifyUser(
        doctor.id,
        "New appointment booked",
        `${patient.fullName} booked a consultation on ${date} at ${startTime}.`,
        "APPOINTMENT",
        "/doctor/appointments",
      );
      persist();
      return send(res, 201, appointment);
    }

    const appointment = second
      ? db.appointments.find((item) => item.id === second)
      : undefined;
    if (second && !appointment) {
      throw new HttpError(404, "Appointment not found.");
    }

    if (appointment) {
      if (method === "GET" && !third) return send(res, 200, appointment);

      if (method === "PATCH" && !third) {
        const status = body.status;
        if (status === "BOOKED" || status === "CANCELLED" || status === "COMPLETED") {
          appointment.status = status;
        }
        if (text(body.date)) appointment.date = text(body.date);
        if (text(body.startTime)) appointment.startTime = text(body.startTime);
        if (text(body.endTime)) appointment.endTime = text(body.endTime);
        if (text(body.reason)) appointment.reason = text(body.reason);
        appointment.updatedAt = nowISO();
        persist();
        return send(res, 200, appointment);
      }

      if (method === "POST" && third === "cancel") {
        if (appointment.status === "COMPLETED") {
          throw new HttpError(409, "Completed appointments cannot be cancelled.");
        }
        appointment.status = "CANCELLED";
        appointment.updatedAt = nowISO();
        const doctor = db.doctors.find(
          (item) => item.id === appointment.doctorId,
        );
        notifyUser(
          appointment.patientId,
          "Appointment cancelled",
          `Your appointment with ${doctor?.fullName ?? "your doctor"} on ${appointment.date} was cancelled.`,
          "APPOINTMENT",
          "/patient/appointments",
        );
        notifyUser(
          appointment.doctorId,
          "Appointment cancelled",
          `An appointment on ${appointment.date} at ${appointment.startTime} was cancelled.`,
          "APPOINTMENT",
          "/doctor/appointments",
        );
        persist();
        return send(res, 200, appointment);
      }

      if (method === "POST" && third === "complete") {
        appointment.status = "COMPLETED";
        appointment.updatedAt = nowISO();
        persist();
        return send(res, 200, appointment);
      }

      if (method === "PATCH" && third === "reschedule") {
        const conflict = db.appointments.some(
          (item) =>
            item.id !== appointment.id &&
            item.doctorId === appointment.doctorId &&
            item.date === text(body.date) &&
            item.startTime === text(body.startTime) &&
            item.status !== "CANCELLED",
        );
        if (conflict) {
          throw new HttpError(409, "That time slot is already booked.");
        }
        appointment.date = text(body.date) || appointment.date;
        appointment.startTime = text(body.startTime) || appointment.startTime;
        appointment.endTime = text(body.endTime) || appointment.endTime;
        appointment.updatedAt = nowISO();
        persist();
        return send(res, 200, appointment);
      }
    }
  }

  /* ---------------------------- Medical records --------------------------- */

  if (root === "medical-records") {
    if (method === "GET" && !second) {
      const patientId = url.searchParams.get("patientId");
      const doctorId = url.searchParams.get("doctorId");
      let rows = db.medicalRecords;
      if (patientId) rows = rows.filter((item) => item.patientId === patientId);
      if (doctorId) rows = rows.filter((item) => item.doctorId === doctorId);
      return send(
        res,
        200,
        rows.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
      );
    }

    if (method === "GET" && second) {
      const record = db.medicalRecords.find((item) => item.id === second);
      if (!record) throw new HttpError(404, "Medical record not found.");
      return send(res, 200, record);
    }

    if (method === "POST") {
      const record: MedicalRecord = {
        ...(body as unknown as Omit<MedicalRecord, "id" | "recordedAt">),
        id: uid("rec"),
        recordedAt: nowISO(),
      };
      db.medicalRecords = [record, ...db.medicalRecords];
      persist();
      return send(res, 201, record);
    }
  }

  /* -------------------------------- Payments ------------------------------ */

  if (root === "payments") {
    if (method === "GET" && !second) {
      const appointmentId = url.searchParams.get("appointmentId");
      if (appointmentId) {
        return send(
          res,
          200,
          db.payments.find((item) => item.appointmentId === appointmentId) ?? null,
        );
      }
      let rows = db.payments;
      const patientId = url.searchParams.get("patientId");
      const hospitalId = url.searchParams.get("hospitalId");
      if (patientId) rows = rows.filter((item) => item.patientId === patientId);
      if (hospitalId) {
        const ids = new Set(
          db.appointments
            .filter((item) => item.hospitalId === hospitalId)
            .map((item) => item.id),
        );
        rows = rows.filter((item) => ids.has(item.appointmentId));
      }
      return send(res, 200, rows);
    }

    const payment = db.payments.find((item) => item.appointmentId === second);
    if (!payment) throw new HttpError(404, "Payment record not found.");

    if (method === "POST" && (third === "pay" || third === "mark-paid")) {
      payment.status = "PAID";
      payment.paidAt = nowISO();
      if (third === "pay") {
        payment.method = "ONLINE";
        payment.transactionRef = `MH-TXN-${Date.now()}`;
      } else {
        payment.method = "PAY_AT_HOSPITAL";
      }
      persist();
      return send(res, 200, payment);
    }

    if (method === "POST" && third === "mark-failed") {
      payment.status = "FAILED";
      persist();
      return send(res, 200, payment);
    }
  }

  /* ----------------------------- AI assistant ----------------------------- */

  if (root === "ai") {
    const user = requireUser(req);

    if (second === "health" && method === "GET") {
      const config = aiConfig();
      return send(res, 200, {
        ok: true,
        aiConfigured: Boolean(config.key),
        model: config.model,
      });
    }

    if (second === "images" && method === "POST") {
      const mimeType = text(body.mimeType);
      const dataUrl = text(body.dataBase64);
      if (!IMAGE_TYPES.includes(mimeType)) {
        throw new HttpError(
          415,
          "Upload a JPG, PNG or WebP image.",
          "UNSUPPORTED_IMAGE",
        );
      }
      if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
        throw new HttpError(400, "The image could not be read. Try attaching it again.");
      }
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const sizeBytes =
        Number(body.sizeBytes) || Math.floor((base64.length * 3) / 4);
      if (sizeBytes > IMAGE_MAX_BYTES) {
        throw new HttpError(413, "Images must be smaller than 5 MB.", "IMAGE_TOO_LARGE");
      }

      pruneImages();
      const image: StoredImage = {
        id: `img-${randomUUID().slice(0, 8)}`,
        fileName: text(body.fileName).trim() || "image",
        mimeType,
        sizeBytes,
        dataUrl,
        uploadedAt: Date.now(),
      };
      images.set(image.id, image);
      return send(res, 201, {
        id: image.id,
        fileName: image.fileName,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        previewUrl: image.dataUrl,
      });
    }

    if (second === "conversations" && method === "GET" && !third) {
      const patientId = url.searchParams.get("patientId") ?? "";
      assertPatient(user, patientId);
      return send(
        res,
        200,
        db.conversations
          .filter((conversation) => conversation.patientId === patientId)
          .slice()
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map(hydrateConversation),
      );
    }

    if (second === "conversations" && method === "POST" && !third) {
      const patientId = text(body.patientId);
      assertPatient(user, patientId);
      const now = nowISO();
      const conversation: AIConversation = {
        id: `cnv-${randomUUID().slice(0, 8)}`,
        patientId,
        title: "New conversation",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      db.conversations = [conversation, ...db.conversations];
      persist();
      return send(res, 201, conversation);
    }

    if (second === "conversations" && method === "GET" && third) {
      const conversation = db.conversations.find((item) => item.id === third);
      if (!conversation) {
        throw new HttpError(404, "This conversation is no longer available.");
      }
      if (conversation.patientId !== user.id) {
        throw new HttpError(
          403,
          "You do not have access to this conversation.",
          "FORBIDDEN",
        );
      }
      return send(res, 200, hydrateConversation(conversation));
    }

    if (second === "health-assistant" && third === "messages" && method === "POST") {
      const patientId = text(body.patientId);
      assertPatient(user, patientId);
      const message = text(body.message).trim();
      const imageIds = Array.isArray(body.imageIds)
        ? body.imageIds.map(String)
        : [];
      if (!message && imageIds.length === 0) {
        throw new HttpError(
          422,
          "Describe your symptoms or attach an image before sending.",
          "EMPTY_MESSAGE",
        );
      }

      pruneImages();
      const attachments = imageIds.map((id) => {
        const image = images.get(id);
        if (!image) {
          throw new HttpError(
            400,
            "That image reference is no longer available. Please attach it again.",
            "IMAGE_EXPIRED",
          );
        }
        return image;
      });

      const requestedId = text(body.conversationId);
      let conversation = requestedId
        ? db.conversations.find((item) => item.id === requestedId)
        : undefined;
      if (requestedId && !conversation) {
        throw new HttpError(404, "This conversation is no longer available.");
      }
      if (conversation && conversation.patientId !== patientId) {
        throw new HttpError(
          403,
          "You do not have access to this conversation.",
          "FORBIDDEN",
        );
      }

      const language = detectLanguage(message, text(body.language));
      const reply = await generateAIReply({
        message,
        patientContext: body.patientContext,
        language,
        imageIds,
      });

      const createdAt = nowISO();
      const title =
        message.replace(/\s+/g, " ").slice(0, 60) || "Image consultation";

      if (!conversation) {
        conversation = {
          id: `cnv-${randomUUID().slice(0, 8)}`,
          patientId,
          title,
          createdAt,
          updatedAt: createdAt,
          messages: [],
        };
      }
      const stored = conversation;
      const conversationId = stored.id;

      const patientMessage: AIChatMessage = {
        id: `msg-${randomUUID().slice(0, 8)}`,
        conversationId,
        role: "PATIENT",
        content: message,
        attachments: attachments.map((image) => ({
          id: image.id,
          fileName: image.fileName,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
          previewUrl: image.dataUrl,
        })),
        isMock: false,
        createdAt,
      };

      const assistantMessage: AIChatMessage = {
        id: `msg-${randomUUID().slice(0, 8)}`,
        conversationId,
        role: "ASSISTANT",
        content: reply.message,
        attachments: [],
        urgency: reply.urgency,
        followUpQuestions: reply.followUpQuestions,
        recommendations: reply.recommendations,
        disclaimer: reply.disclaimer,
        recommendedDoctorIds: reply.recommendedDoctorIds,
        recommendedHospitalIds: reply.recommendedHospitalIds,
        isMock: false,
        createdAt: nowISO(),
      };

      if (stored.messages.length === 0) stored.title = title;
      stored.messages = [
        ...stored.messages,
        persistableMessage(patientMessage),
        persistableMessage(assistantMessage),
      ];
      stored.updatedAt = assistantMessage.createdAt;
      if (!db.conversations.some((item) => item.id === conversationId)) {
        db.conversations = [stored, ...db.conversations];
      }
      persist();

      return send(res, 200, { ...reply, conversationId, isMock: false });
    }
  }

  /* ----------------------------- Notifications ---------------------------- */

  if (root === "notifications") {
    if (method === "GET" && second === "unread-count") {
      const userId = url.searchParams.get("userId");
      return send(
        res,
        200,
        db.notifications.filter(
          (item) => item.userId === userId && !item.isRead,
        ).length,
      );
    }
    if (method === "GET" && !second) {
      const userId = url.searchParams.get("userId");
      return send(
        res,
        200,
        db.notifications.filter((item) => item.userId === userId),
      );
    }
    if (method === "POST" && second === "read-all") {
      const userId = text(body.userId);
      db.notifications.forEach((item) => {
        if (item.userId === userId) item.isRead = true;
      });
      persist();
      return send(res, 200, {});
    }
    if (method === "POST" && third === "read") {
      const notification = db.notifications.find((item) => item.id === second);
      if (notification) notification.isRead = true;
      persist();
      return send(res, 200, {});
    }
  }

  throw new HttpError(404, "Not found.");
}

async function middleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) {
  try {
    await handle(req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      send(res, error.status, { message: error.message, code: error.code });
      return;
    }
    if (error instanceof Error && error.message.includes("Unexpected end of JSON")) {
      send(res, 400, { message: "Invalid request body." });
      return;
    }
    send(res, 500, { message: "Unexpected server error." });
    next(error);
  }
}

/**
 * Local API backend for development.
 *
 * Mounted by Vite at `/api`, persisted to `server/data.json` (gitignored).
 * Auth and the Super Admin portal use this API; patient-facing appointment
 * data still resolves through the shared mock service layer.
 */
export function apiPlugin(): Plugin {
  return {
    name: "myhealth-api",
    configureServer(server) {
      server.middlewares.use("/api", middleware);
    },
  };
}
