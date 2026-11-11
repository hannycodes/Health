/**
 * MyHealth API.
 *
 * Node HTTP server with file-backed persistence (server/data/db.json) and a
 * medical AI proxy. The provider key lives here, never in the browser bundle.
 *
 * Run: npm run api   (listens on :8000, proxied by Vite at /api)
 */
import http from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = join(root, "data");
const dbFile = join(dataDir, "db.json");

const PORT = Number(process.env.PORT) || 8000;
const SEED_PASSWORD = process.env.SEED_PASSWORD || "MyHealth2026!";
const AI_KEY = process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY || "";
const AI_BASE = (
  process.env.ZAI_API_BASE ||
  process.env.OPENAI_BASE_URL ||
  "https://api.z.ai/api/paas/v4"
).replace(/\/$/, "");
const AI_MODEL = process.env.ZAI_MODEL || process.env.OPENAI_MODEL || "glm-4v-flash";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CARE_URGENCIES = ["EMERGENCY", "URGENT", "ROUTINE", "INFORMATIONAL"];
const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "General Medicine",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
];

/* -------------------------------------------------------------------------- */
/*                              Persistence                                   */
/* -------------------------------------------------------------------------- */

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
const nowISO = () => new Date().toISOString();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const { createSeedDatabase } = await import("../src/data/seed.ts");

function seedDatabase() {
  const seed = createSeedDatabase();
  const users = [...seed.patients, ...seed.doctors, ...seed.hospitalAdmins, ...seed.superAdmins];
  const passwords = {};
  users.forEach((user) => {
    passwords[user.id] = hashPassword(SEED_PASSWORD);
  });
  // AI history starts empty: replies are generated live, never seeded.
  return { ...seed, conversations: [], passwords, sessions: {} };
}

function loadDatabase() {
  try {
    if (!existsSync(dbFile)) return seedDatabase();
    const parsed = JSON.parse(readFileSync(dbFile, "utf8"));
    if (!parsed.patients || !parsed.doctors) return seedDatabase();
    return {
      ...seedDatabase(),
      ...parsed,
      conversations: parsed.conversations ?? [],
      passwords: parsed.passwords ?? seedDatabase().passwords,
      sessions: parsed.sessions ?? {},
    };
  } catch {
    return seedDatabase();
  }
}

let db = loadDatabase();

function save() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf8");
}

function allUsers() {
  return [...db.patients, ...db.doctors, ...db.hospitalAdmins, ...db.superAdmins];
}

const findUser = (id) => allUsers().find((user) => user.id === id) ?? null;

function pushNotification({ userId, title, message, type, link }) {
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
/*                                  HTTP                                      */
/* -------------------------------------------------------------------------- */

function send(res, status, body) {
  const payload = JSON.stringify(body ?? null);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function readBody(req, limit = 16 * 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail(413, "The uploaded payload is too large.");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    fail(400, "The request body is not valid JSON.");
  }
}

function authenticate(req) {
  const header = req.headers.authorization ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const userId = db.sessions[token];
  return userId ? findUser(userId) : null;
}

/* -------------------------------------------------------------------------- */
/*                              Domain helpers                                */
/* -------------------------------------------------------------------------- */

function appointmentMatches(appointment, params) {
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

const sortAppointments = (a, b) =>
  `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);

function detailedAppointments(params) {
  return db.appointments
    .filter((appointment) => appointmentMatches(appointment, params))
    .sort(sortAppointments)
    .map((appointment) => {
      const patient = db.patients.find((item) => item.id === appointment.patientId);
      const doctor = db.doctors.find((item) => item.id === appointment.doctorId);
      const hospital = db.hospitals.find((item) => item.id === appointment.hospitalId);
      const payment = db.payments.find((item) => item.appointmentId === appointment.id);
      return {
        ...appointment,
        patientName: patient?.fullName ?? "Unknown patient",
        doctorName: doctor?.fullName ?? "Unknown doctor",
        doctorSpecialty: doctor?.specialty ?? "General Medicine",
        hospitalName: hospital?.name ?? "Unknown hospital",
        paymentStatus: payment?.status,
        paymentMethod: payment?.method,
      };
    });
}

function paymentFor(appointmentId) {
  return db.payments.find((item) => item.appointmentId === appointmentId) ?? null;
}

/* -------------------------------------------------------------------------- */
/*                              AI assistant                                  */
/* -------------------------------------------------------------------------- */

/** Uploaded images stay in memory: never written to the database or disk. */
const images = new Map();

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
{"message":"string","urgency":"EMERGENCY|URGENT|ROUTINE|INFORMATIONAL","followUpQuestions":["..."],"recommendations":["..."],"recommendedSpecialty":"one of ${SPECIALTIES.join("|")} or empty string","disclaimer":"string"}`;

const EMERGENCY_MESSAGE = {
  en: "What you described may be a medical emergency. Call your local emergency number or go to the nearest emergency department now. Do not wait for an appointment, and do not drive yourself if you feel faint.",
  am: "የገለጹት ምልክት የድንገተኛ ሕክምና ሁኔታ ሊሆን ይችላል። አሁን ወደ አቅራቢያዎ የድንገተኛ ክፍል ይሂዱ ወይም የድንገተኛ አገልግሎት ቁጥር ይደውሉ። ቀጠሮ አይጠብቁ።",
};

const DISCLAIMER =
  "This is general health information from MyHealth, not a diagnosis or a prescription. A qualified clinician must assess your symptoms.";

function isEmergency(text) {
  const lower = (text ?? "").toLowerCase();
  return EMERGENCY_PATTERNS.some((pattern) => lower.includes(pattern));
}

const ETHIOPIC_SCRIPT = /[\u1200-\u137F]/;

/**
 * The patient may type or dictate in English or Amharic. Ethiopic script is a
 * reliable signal for Amharic; otherwise an explicit choice wins, and "auto"
 * falls back to English.
 */
function detectLanguage(message, requested) {
  if (ETHIOPIC_SCRIPT.test(String(message ?? ""))) return "am";
  if (requested === "am" || requested === "en") return requested;
  return "en";
}

function languageName(language) {
  return language === "am" ? "Amharic (አማርኛ)" : "English";
}

function buildUserText({ message, patientContext, language, hasImages }) {
  const context = patientContext && Object.keys(patientContext).length > 0
    ? `Patient context (saved by the patient, may be incomplete): ${JSON.stringify(patientContext)}`
    : "No patient context was provided. Do not invent any.";
  return [
    `Reply language: ${languageName(language)}. Every string you return must be in that language.`,
    context,
    hasImages ? "The patient attached one or more images. They may help describe the visible area, but they cannot confirm a condition." : "",
    `Patient message: ${message || "(no text, image only)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function recommendationsFor(specialty) {
  if (!specialty || !SPECIALTIES.includes(specialty)) {
    return { doctorIds: [], hospitalIds: [] };
  }
  const doctors = db.doctors.filter(
    (doctor) => doctor.specialty === specialty && doctor.isAcceptingPatients,
  );
  return {
    doctorIds: doctors.map((doctor) => doctor.id),
    hospitalIds: [...new Set(doctors.map((doctor) => doctor.hospitalId))],
  };
}

async function callProvider(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("AI provider error", response.status, detail.slice(0, 500));
      fail(502, "The medical AI service could not answer right now.");
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function generateReply({ message, patientContext, language, imageIds }) {
  if (isEmergency(message)) {
    return {
      message: EMERGENCY_MESSAGE[language] ?? EMERGENCY_MESSAGE.en,
      urgency: "EMERGENCY",
      followUpQuestions: [],
      recommendations:
        language === "am"
          ? ["አሁን የድንገተኛ አገልግሎት ይደውሉ።", "አካላዊ ጉዳት ካለ በአቅራቢያዎ ያለ ሰው ይጠይቁ።"]
          : ["Call emergency services now.", "Ask someone nearby to stay with you."],
      recommendedSpecialty: "",
      disclaimer: DISCLAIMER,
      source: "safety",
    };
  }

  if (!AI_KEY) {
    fail(
      503,
      "The medical AI is not configured yet. Add ZAI_API_KEY to the server environment and restart the API.",
    );
  }

  const providerImages = (imageIds ?? [])
    .map((id) => images.get(id))
    .filter(Boolean);

  const userContent = [{ type: "text", text: buildUserText({ message, patientContext, language, hasImages: providerImages.length > 0 }) }];
  providerImages.forEach((image) => {
    userContent.push({ type: "image_url", image_url: { url: image.dataUrl } });
  });

  const data = await callProvider({
    model: AI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(raw) ?? {};
  const urgency = CARE_URGENCIES.includes(parsed.urgency) ? parsed.urgency : "ROUTINE";

  return {
    message: typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : String(raw).trim(),
    urgency,
    followUpQuestions: Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 4).map(String)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 5).map(String)
      : [],
    recommendedSpecialty: typeof parsed.recommendedSpecialty === "string"
      ? parsed.recommendedSpecialty
      : "",
    disclaimer: DISCLAIMER,
    source: "ai",
  };
}

function hydrateConversation(conversation) {
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

/* -------------------------------------------------------------------------- */
/*                                 Router                                     */
/* -------------------------------------------------------------------------- */

async function handle(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, null);

  const url = new URL(req.url, "http://localhost");
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const params = url.searchParams;

  if (req.method === "GET" && segments[0] === "health") {
    return send(res, 200, { ok: true, aiConfigured: Boolean(AI_KEY), model: AI_MODEL });
  }

  if (req.method === "POST" && segments[0] === "auth" && segments[1] === "login") {
    const { email = "", password = "" } = await readBody(req);
    const user = allUsers().find(
      (candidate) => candidate.email.toLowerCase() === String(email).trim().toLowerCase(),
    );
    if (!user || !verifyPassword(password, db.passwords[user.id])) {
      return send(res, 401, { message: "Invalid email or password." });
    }
    const token = randomBytes(24).toString("hex");
    db.sessions[token] = user.id;
    save();
    return send(res, 200, {
      user,
      token,
      hospitalId: user.hospitalId,
    });
  }

  const user = authenticate(req);
  if (!user) return send(res, 401, { message: "Your session has expired. Sign in again." });

  if (req.method === "POST" && segments[0] === "auth" && segments[1] === "logout") {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    delete db.sessions[token];
    save();
    return send(res, 200, { ok: true });
  }

  if (req.method === "GET" && segments[0] === "auth" && segments[1] === "me") {
    return send(res, 200, user);
  }

  /* ------------------------------- patients ------------------------------- */
  if (segments[0] === "patients") {
    if (req.method === "GET" && segments[1] === "me") {
      const patient = db.patients.find((item) => item.id === params.get("userId")) ?? null;
      return send(res, 200, patient);
    }
    if (req.method === "GET" && !segments[1]) return send(res, 200, db.patients);
    if (segments[1]) {
      const patient = db.patients.find((item) => item.id === segments[1]);
      if (!patient) return send(res, 404, { message: "Patient profile not found." });
      if (req.method === "GET") return send(res, 200, patient);
      if (req.method === "PATCH") {
        const patch = await readBody(req);
        const editable = [
          "fullName",
          "phone",
          "address",
          "emergencyContact",
          "bloodType",
          "dateOfBirth",
          "gender",
          "weightKg",
          "heightCm",
          "allergies",
          "conditions",
          "medications",
          "medicalNotes",
        ];
        editable.forEach((key) => {
          if (key in patch) patient[key] = patch[key];
        });
        save();
        return send(res, 200, patient);
      }
    }
  }

  /* -------------------------------- doctors ------------------------------- */
  if (segments[0] === "doctors") {
    if (req.method === "GET" && segments[1] === "me") {
      return send(res, 200, db.doctors.find((item) => item.id === params.get("userId")) ?? null);
    }
    if (req.method === "GET" && segments[1] && segments[2] === "availability") {
      return send(
        res,
        200,
        db.availability.filter((slot) => slot.doctorId === segments[1]),
      );
    }
    if (req.method === "GET" && !segments[1]) {
      const search = (params.get("search") ?? "").trim().toLowerCase();
      const specialty = params.get("specialty");
      const hospitalId = params.get("hospitalId");
      const acceptingOnly = params.get("acceptingOnly");
      const rows = db.doctors.filter((doctor) => {
        if (specialty && doctor.specialty !== specialty) return false;
        if (hospitalId && doctor.hospitalId !== hospitalId) return false;
        if (acceptingOnly === "true" && !doctor.isAcceptingPatients) return false;
        if (search && !`${doctor.fullName} ${doctor.specialty}`.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      });
      return send(res, 200, rows);
    }
    if (segments[1]) {
      const doctor = db.doctors.find((item) => item.id === segments[1]);
      if (!doctor) return send(res, 404, { message: "Doctor not found." });
      if (req.method === "GET") return send(res, 200, doctor);
      if (req.method === "PATCH") {
        Object.assign(doctor, await readBody(req));
        save();
        return send(res, 200, doctor);
      }
    }
  }

  /* ------------------------------- hospitals ------------------------------ */
  if (segments[0] === "hospitals") {
    if (req.method === "GET" && !segments[1]) {
      const search = (params.get("search") ?? "").trim().toLowerCase();
      const approvalStatus = params.get("approvalStatus");
      const city = params.get("city");
      const rows = db.hospitals.filter((hospital) => {
        if (approvalStatus && hospital.approvalStatus !== approvalStatus) return false;
        if (city && hospital.city !== city) return false;
        if (search && !`${hospital.name} ${hospital.city}`.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      });
      return send(res, 200, rows);
    }
    if (segments[1]) {
      const hospital = db.hospitals.find((item) => item.id === segments[1]);
      if (!hospital) return send(res, 404, { message: "Hospital not found." });
      if (req.method === "GET") return send(res, 200, hospital);
    }
  }

  /* ------------------------------ appointments ---------------------------- */
  if (segments[0] === "appointments") {
    if (req.method === "GET" && !segments[1]) {
      if (params.get("expand")) return send(res, 200, detailedAppointments(params));
      return send(
        res,
        200,
        db.appointments.filter((item) => appointmentMatches(item, params)).sort(sortAppointments),
      );
    }
    if (req.method === "POST" && !segments[1]) {
      const input = await readBody(req);
      const doctor = db.doctors.find((item) => item.id === input.doctorId);
      const hospital = db.hospitals.find((item) => item.id === input.hospitalId);
      const patient = db.patients.find((item) => item.id === input.patientId);
      if (!doctor) fail(404, "Doctor not found.");
      if (!hospital) fail(404, "Hospital not found.");
      if (!patient) fail(404, "Patient profile not found.");
      if (hospital.approvalStatus !== "APPROVED") {
        fail(409, "This hospital is not approved to accept appointments.");
      }
      const conflict = db.appointments.some(
        (item) =>
          item.doctorId === input.doctorId &&
          item.date === input.date &&
          item.startTime === input.startTime &&
          item.status !== "CANCELLED",
      );
      if (conflict) fail(409, "That time slot is already booked. Choose another.");

      const timestamp = nowISO();
      const appointmentId = uid("apt");
      const paymentId = uid("pay");
      const online = input.paymentMethod === "ONLINE";
      const payment = {
        id: paymentId,
        appointmentId,
        patientId: input.patientId,
        amount: doctor.consultationFee,
        currency: "ETB",
        method: input.paymentMethod,
        status: online ? "PENDING" : "UNPAID_AT_HOSPITAL",
        createdAt: timestamp,
      };
      const appointment = {
        id: appointmentId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        hospitalId: input.hospitalId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "BOOKED",
        reason: input.reason,
        paymentId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.payments = [payment, ...db.payments];
      db.appointments = [appointment, ...db.appointments];
      pushNotification({
        userId: input.patientId,
        title: "Appointment confirmed",
        message: `Your appointment with ${doctor.fullName} on ${input.date} at ${input.startTime} is confirmed.`,
        type: "APPOINTMENT",
        link: "/patient/appointments",
      });
      pushNotification({
        userId: doctor.id,
        title: "New appointment booked",
        message: `${patient.fullName} booked a consultation on ${input.date} at ${input.startTime}.`,
        type: "APPOINTMENT",
        link: "/doctor/appointments",
      });
      save();
      return send(res, 201, appointment);
    }
    const appointment = db.appointments.find((item) => item.id === segments[1]);
    if (!appointment) return send(res, 404, { message: "Appointment not found." });
    if (req.method === "GET") return send(res, 200, appointment);
    if (req.method === "PATCH") {
      const patch = await readBody(req);
      if (patch.status && ["BOOKED", "CANCELLED", "COMPLETED"].includes(patch.status)) {
        appointment.status = patch.status;
      }
      if (patch.date) appointment.date = patch.date;
      if (patch.startTime) appointment.startTime = patch.startTime;
      if (patch.endTime) appointment.endTime = patch.endTime;
      if (patch.reason) appointment.reason = patch.reason;
      appointment.updatedAt = nowISO();
      save();
      return send(res, 200, appointment);
    }
    if (req.method === "POST" && segments[2] === "cancel") {
      if (appointment.status === "COMPLETED") {
        fail(409, "Completed appointments cannot be cancelled.");
      }
      appointment.status = "CANCELLED";
      appointment.updatedAt = nowISO();
      const doctor = db.doctors.find((item) => item.id === appointment.doctorId);
      pushNotification({
        userId: appointment.doctorId,
        title: "Appointment cancelled",
        message: `An appointment on ${appointment.date} at ${appointment.startTime} was cancelled.`,
        type: "APPOINTMENT",
        link: "/doctor/appointments",
      });
      pushNotification({
        userId: appointment.patientId,
        title: "Appointment cancelled",
        message: `Your appointment with ${doctor?.fullName ?? "your doctor"} on ${appointment.date} was cancelled.`,
        type: "APPOINTMENT",
        link: "/patient/appointments",
      });
      save();
      return send(res, 200, appointment);
    }
    if (req.method === "POST" && segments[2] === "complete") {
      appointment.status = "COMPLETED";
      appointment.updatedAt = nowISO();
      save();
      return send(res, 200, appointment);
    }
    if (req.method === "PATCH" && segments[2] === "reschedule") {
      const { date, startTime, endTime } = await readBody(req);
      const conflict = db.appointments.some(
        (item) =>
          item.id !== appointment.id &&
          item.doctorId === appointment.doctorId &&
          item.date === date &&
          item.startTime === startTime &&
          item.status !== "CANCELLED",
      );
      if (conflict) fail(409, "That time slot is already booked.");
      Object.assign(appointment, { date, startTime, endTime, updatedAt: nowISO() });
      save();
      return send(res, 200, appointment);
    }
  }

  /* ----------------------------- medical records -------------------------- */
  if (segments[0] === "medical-records") {
    if (req.method === "GET" && !segments[1]) {
      const patientId = params.get("patientId");
      const doctorId = params.get("doctorId");
      let rows = db.medicalRecords;
      if (patientId) rows = rows.filter((item) => item.patientId === patientId);
      if (doctorId) rows = rows.filter((item) => item.doctorId === doctorId);
      return send(
        res,
        200,
        rows.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
      );
    }
    if (req.method === "GET" && segments[1]) {
      const record = db.medicalRecords.find((item) => item.id === segments[1]);
      if (!record) return send(res, 404, { message: "Medical record not found." });
      return send(res, 200, record);
    }
    if (req.method === "POST") {
      const input = await readBody(req);
      const record = { ...input, id: uid("rec"), recordedAt: nowISO() };
      db.medicalRecords = [record, ...db.medicalRecords];
      save();
      return send(res, 201, record);
    }
  }

  /* -------------------------------- payments ------------------------------ */
  if (segments[0] === "payments") {
    if (req.method === "GET") {
      if (params.get("appointmentId")) {
        return send(res, 200, paymentFor(params.get("appointmentId")));
      }
      const patientId = params.get("patientId");
      const hospitalId = params.get("hospitalId");
      let rows = db.payments;
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
    const payment = db.payments.find((item) => item.appointmentId === segments[1]);
    if (!payment) return send(res, 404, { message: "Payment record not found." });
    if (segments[2] === "pay" || segments[2] === "mark-paid") {
      payment.status = "PAID";
      payment.paidAt = nowISO();
      if (segments[2] === "pay") {
        payment.method = "ONLINE";
        payment.transactionRef = `MH-TXN-${Date.now()}`;
      } else {
        payment.method = "PAY_AT_HOSPITAL";
      }
      save();
      return send(res, 200, payment);
    }
    if (segments[2] === "mark-failed") {
      payment.status = "FAILED";
      save();
      return send(res, 200, payment);
    }
  }

  /* ----------------------------- notifications ---------------------------- */
  if (segments[0] === "notifications") {
    if (req.method === "GET" && segments[1] === "unread-count") {
      const userId = params.get("userId");
      return send(
        res,
        200,
        db.notifications.filter((item) => item.userId === userId && !item.isRead).length,
      );
    }
    if (req.method === "GET") {
      const userId = params.get("userId");
      return send(
        res,
        200,
        db.notifications.filter((item) => item.userId === userId),
      );
    }
    if (req.method === "POST" && segments[1] === "read-all") {
      const { userId } = await readBody(req);
      db.notifications.forEach((item) => {
        if (item.userId === userId) item.isRead = true;
      });
      save();
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && segments[2] === "read") {
      const notification = db.notifications.find((item) => item.id === segments[1]);
      if (notification) notification.isRead = true;
      save();
      return send(res, 200, { ok: true });
    }
  }

  /* ------------------------------- AI routes ------------------------------ */
  if (segments[0] === "ai" && segments[1] === "images" && req.method === "POST") {
    const { fileName, mimeType, sizeBytes, dataBase64 } = await readBody(req);
    if (!IMAGE_TYPES.includes(mimeType)) {
      return send(res, 415, { message: "Upload a JPG, PNG or WebP image." });
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes > MAX_IMAGE_BYTES) {
      return send(res, 413, { message: "Images must be smaller than 5 MB." });
    }
    if (typeof dataBase64 !== "string" || !dataBase64.startsWith("data:image/")) {
      return send(res, 400, { message: "The image payload is not valid." });
    }
    const id = uid("img");
    const image = { id, fileName, mimeType, sizeBytes, dataUrl: dataBase64 };
    images.set(id, image);
    return send(res, 201, {
      id,
      fileName,
      mimeType,
      sizeBytes,
      previewUrl: dataBase64,
    });
  }

  if (segments[0] === "ai" && segments[1] === "conversations") {
    if (req.method === "GET" && !segments[2]) {
      const patientId = params.get("patientId");
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
    if (req.method === "POST" && !segments[2]) {
      const { patientId } = await readBody(req);
      if (user.role === "PATIENT" && patientId !== user.id) {
        fail(403, "You do not have access to this patient's conversations.");
      }
      const timestamp = nowISO();
      const conversation = {
        id: uid("cnv"),
        patientId,
        title: "New conversation",
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: [],
      };
      db.conversations = [conversation, ...db.conversations];
      save();
      return send(res, 201, conversation);
    }
    if (req.method === "GET" && segments[2]) {
      const conversation = db.conversations.find((item) => item.id === segments[2]);
      if (!conversation) return send(res, 404, { message: "Conversation not found." });
      if (user.role === "PATIENT" && conversation.patientId !== user.id) {
        return send(res, 403, { message: "You do not have access to this conversation." });
      }
      return send(res, 200, hydrateConversation(conversation));
    }
  }

  if (segments[0] === "ai" && segments[1] === "health-assistant" && segments[2] === "messages") {
    if (req.method !== "POST") return send(res, 405, { message: "Method not allowed." });
    const body = await readBody(req);
    const {
      conversationId,
      patientId,
      message = "",
      patientContext = {},
      imageIds = [],
      language = "auto",
    } = body;

    if (user.role === "PATIENT" && patientId !== user.id) {
      return send(res, 403, { message: "You do not have access to this patient." });
    }
    if (!String(message).trim() && !(imageIds ?? []).length) {
      return send(res, 422, { message: "Describe your symptoms or attach an image." });
    }
    const missingImage = (imageIds ?? []).find((id) => !images.has(id));
    if (missingImage) {
      return send(res, 400, { message: "That image reference has expired. Attach it again." });
    }

    let conversation = conversationId
      ? db.conversations.find((item) => item.id === conversationId)
      : null;
    if (conversationId && !conversation) {
      return send(res, 404, { message: "This conversation is no longer available." });
    }
    if (conversation && conversation.patientId !== patientId) {
      return send(res, 403, { message: "You do not have access to this conversation." });
    }

    const replyLanguage = detectLanguage(message, language);
    const reply = await generateReply({
      message,
      patientContext,
      language: replyLanguage,
      imageIds,
    });
    const timestamp = nowISO();
    if (!conversation) {
      const title = String(message).trim().slice(0, 60) || "Image consultation";
      conversation = {
        id: uid("cnv"),
        patientId,
        title,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: [],
      };
      db.conversations = [conversation, ...db.conversations];
    }

    const attachments = (imageIds ?? []).map((id) => {
      const image = images.get(id);
      return {
        id,
        fileName: image.fileName,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        previewUrl: "",
      };
    });

    const patientMessage = {
      id: uid("msg"),
      conversationId: conversation.id,
      role: "PATIENT",
      content: String(message),
      attachments,
      isMock: false,
      createdAt: timestamp,
    };

    const { doctorIds, hospitalIds } = recommendationsFor(reply.recommendedSpecialty);

    const assistantMessage = {
      id: uid("msg"),
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: reply.message,
      attachments: [],
      urgency: reply.urgency,
      followUpQuestions: reply.followUpQuestions,
      recommendations: reply.recommendations,
      disclaimer: reply.disclaimer,
      recommendedDoctorIds: doctorIds,
      recommendedHospitalIds: hospitalIds,
      isMock: false,
      createdAt: nowISO(),
    };

    conversation.messages.push(patientMessage, assistantMessage);
    conversation.updatedAt = assistantMessage.createdAt;
    save();

    return send(res, 200, {
      conversationId: conversation.id,
      message: reply.message,
      urgency: reply.urgency,
      followUpQuestions: reply.followUpQuestions,
      recommendations: reply.recommendations,
      disclaimer: reply.disclaimer,
      recommendedDoctorIds: doctorIds,
      recommendedHospitalIds: hospitalIds,
      isMock: false,
    });
  }

  return send(res, 404, { message: "Endpoint not found." });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    send(res, status, {
      message:
        status === 500
          ? "Something went wrong on the server. Please try again."
          : error.message,
    });
  });
});

server.listen(PORT, () => {
  console.log(`MyHealth API listening on http://localhost:${PORT}`);
  console.log(`AI provider: ${AI_KEY ? `${AI_MODEL} via ${AI_BASE}` : "not configured (set ZAI_API_KEY)"}`);
});
