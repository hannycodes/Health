#!/usr/bin/env node
/**
 * End-to-end check of the clinical AI gateway against the configured provider.
 *
 * Start the gateway first (`npm run dev:ai`), then:
 *
 *   npm run verify:ai
 *   npm run verify:ai -- --en voice-en.wav --am voice-am.wav
 *
 * Exit codes: 0 = every check passed, 1 = a check failed, 2 = the provider is
 * not usable yet (missing key or no balance).
 */
import { readFile } from "node:fs/promises";

const GATEWAY = `http://127.0.0.1:${process.env.AI_PORT ?? 8787}`;
const SCRIPT_TIMEOUT_MS = 90_000;

const args = process.argv.slice(2);
const argValue = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const audioFiles = { en: argValue("--en"), am: argValue("--am") };

const results = [];

function report(level, name, detail) {
  results.push({ level });
  console.log(`${level.padEnd(9)}${name}${detail ? ` — ${detail}` : ""}`);
}

const PATIENT = {
  id: "pat-001",
  fullName: "Abebe Tesfaye",
  dateOfBirth: "1989-04-12",
  sex: "MALE",
  bloodType: "O+",
};

const RECORDS = [
  {
    id: "rec-001",
    recordedAt: "2026-10-01T08:00:00.000Z",
    doctorName: "Dr. Tigist Alemayehu",
    hospitalName: "Addis Care General Hospital",
    diagnosis: "Contact dermatitis, likely detergent related.",
    treatment: "Topical corticosteroid course for 14 days.",
    prescription: ["Hydrocortisone 1% cream — twice daily", "Cetirizine 10mg — nightly"],
    notes: "Advised to switch to fragrance-free detergent.",
  },
];

async function request(path, init) {
  const response = await fetch(`${GATEWAY}${path}`, {
    ...init,
    signal: AbortSignal.timeout(SCRIPT_TIMEOUT_MS),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: text.slice(0, 200) || `HTTP ${response.status}` };
  }
  return { status: response.status, body };
}

/** Classify a failed response: provider-blocked vs. an actual defect. */
function failure(name, result) {
  const message = result.body?.error ?? "unknown error";
  if (result.status === 402 || /insufficient balance|no resource package/i.test(message)) {
    report("BLOCKED", name, message);
    return;
  }
  if (result.status === 503) {
    report("BLOCKED", name, message);
    return;
  }
  report("FAIL", name, `HTTP ${result.status}: ${message}`);
}

async function checkStatus() {
  let result;
  try {
    result = await request("/api/ai/status");
  } catch {
    report("FAIL", "gateway", `not reachable at ${GATEWAY} — run \`npm run dev:ai\``);
    return;
  }
  if (result.status !== 200) {
    failure("status", result);
    return;
  }
  const { configured, provider, chatModel, transcribeModel } = result.body;
  report(
    configured ? "PASS" : "BLOCKED",
    "status",
    `configured=${configured} provider=${provider} chat=${chatModel} transcribe=${transcribeModel}`,
  );
}

async function checkClinical(language) {
  const label = `clinical (${language})`;
  const result = await request("/api/ai/clinical", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "CLINICAL_ANALYSIS",
      message: "Analyse this documented history and flag anything urgent.",
      language,
      patient: PATIENT,
      records: RECORDS,
      appointments: [],
    }),
  });

  if (result.status !== 200) {
    failure(label, result);
    return;
  }

  const body = result.body ?? {};
  const missing = ["answer", "clinicalConsiderations", "redFlags", "urgency"].filter(
    (field) => body[field] === undefined,
  );
  if (missing.length > 0) {
    report("FAIL", label, `response missing ${missing.join(", ")}`);
    return;
  }

  if (language === "am" && !/\p{Script=Ethiopic}/u.test(body.answer)) {
    report("FAIL", label, "Amharic request returned no Ethiopic script");
    return;
  }
  if (language === "am" && /[A-Za-z]{12,}/.test(body.answer.replace(/\b[A-Z]{2,}\b/g, ""))) {
    report("FAIL", label, "Amharic request looks like it answered in English");
    return;
  }

  report("PASS", label, `${body.urgency} · ${String(body.answer).slice(0, 60)}…`);
}

async function checkTranscription(language, file) {
  const label = `transcribe (${language})`;
  if (!file) {
    report("SKIP", label, `no audio supplied — pass --${language} <file.wav|file.mp3>`);
    return;
  }

  const audio = await readFile(file);
  const type = file.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
  const result = await request("/api/ai/transcribe", {
    method: "POST",
    headers: { "Content-Type": type, "X-Audio-Language": language },
    body: audio,
  });

  if (result.status !== 200) {
    failure(label, result);
    return;
  }
  const text = String(result.body?.text ?? "").trim();
  if (!text) {
    report("FAIL", label, "empty transcript");
    return;
  }
  if (language === "am" && !/\p{Script=Ethiopic}/u.test(text)) {
    report("FAIL", label, `Amharic audio produced no Ethiopic text: ${text.slice(0, 80)}`);
    return;
  }
  report("PASS", label, `${text.length} chars · ${text.slice(0, 70)}`);
}

console.log(`MyHealth AI verification → ${GATEWAY}\n`);
await checkStatus();
try {
  await checkClinical("en");
  await checkClinical("am");
  await checkTranscription("en", audioFiles.en);
  await checkTranscription("am", audioFiles.am);
} catch (error) {
  report("FAIL", "request", error instanceof Error ? error.message : String(error));
}

const failed = results.filter((result) => result.level === "FAIL").length;
const blocked = results.filter((result) => result.level === "BLOCKED").length;
const skipped = results.filter((result) => result.level === "SKIP").length;

console.log(
  `\n${results.length - failed - blocked - skipped} passed · ${failed} failed · ${blocked} blocked · ${skipped} skipped`,
);
if (failed > 0) process.exit(1);
if (blocked > 0) process.exit(2);
