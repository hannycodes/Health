# MyHealth API

Node.js + Express backend for MyHealth. It serves the same domain contracts the
frontend already defines in `src/types`, so switching the frontend from mocks to
HTTP is a configuration change rather than a rewrite.

Data lives in a JSON file (`server/data/db.json`, created and seeded on first
start, gitignored). The store is deliberately isolated in `src/db.js`: replacing
it with PostgreSQL later means changing that one module, not the routes.

## Running

```bash
cd server
npm install
cp .env.example .env   # optional; the defaults work locally
npm start              # http://localhost:8000
```

`npm run dev` restarts on file changes. Health check: `GET /api/health`.

## Seeded accounts

Every account uses the password `Password123!` (override with
`DEV_SEED_PASSWORD` before the first start, since the hash is created at seed
time).

| Email | Role | Scope |
| --- | --- | --- |
| `patient@myhealth.et` | PATIENT | pat-001 |
| `doctor@myhealth.et` | DOCTOR | doc-001, hsp-001 |
| `hospital@myhealth.et` | HOSPITAL_ADMIN | adm-001, hsp-001 |
| `getachew.bekele@myhealth.et` | HOSPITAL_ADMIN | adm-002, hsp-002 |
| `admin@myhealth.et` | SUPER_ADMIN | platform-wide |

Additional patients (`hana.girma@example.com`, `dawit.mekonnen@example.com`, …)
and doctors share the same password.

## Authentication

`POST /api/auth/login` returns `{ user, token, hospitalId }`. Send the token as
`Authorization: Bearer <token>` on every other request. Tokens expire after
`JWT_EXPIRES_IN` (12h by default) and the user record is reloaded on each
request, so deactivating an account takes effect immediately.

Patient objects never include `passwordHash`.

## Endpoints

### Directory

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any signed-in user |
| GET | `/api/auth/me` | any signed-in user |
| GET | `/api/hospitals` | any (admins see only their hospital) |
| GET | `/api/hospitals/:id` | any, scoped |
| PATCH | `/api/hospitals/:id` | hospital admin (own), super admin |
| PATCH | `/api/hospitals/:id/approval` | super admin |
| PATCH | `/api/hospitals/:id/capacity` | hospital admin (own), super admin |
| GET | `/api/departments` | any, scoped |
| GET | `/api/departments/:id` | any, scoped |
| POST | `/api/departments` | hospital admin (own hospital), super admin |
| PATCH | `/api/departments/:id` | hospital admin (own), super admin |
| PATCH | `/api/departments/:id/status` | hospital admin (own), super admin |
| GET | `/api/doctors` | any, scoped |
| GET | `/api/doctors/me` | doctor |
| GET | `/api/doctors/:id` | any, scoped |
| POST | `/api/doctors` | hospital admin (own hospital), super admin |
| PATCH | `/api/doctors/:id` | hospital admin (own), super admin, doctor (self) |
| PATCH | `/api/doctors/:id/activation` | hospital admin (own), super admin |
| GET | `/api/doctors/:id/availability` | any, scoped |
| POST | `/api/availability` | doctor (self), hospital admin |
| PATCH | `/api/availability/:id` | doctor (self), hospital admin |
| DELETE | `/api/availability/:id` | doctor (self), hospital admin |
| GET | `/api/patients` | doctor, hospital admin, super admin |
| GET | `/api/patients/me` | any signed-in user |
| GET | `/api/patients/:id` | patient (self), doctor in care, hospital admin with a visit |
| PATCH | `/api/patients/:id` | patient (self) |

### Scheduling

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/appointments` | filters: `patientId`, `doctorId`, `hospitalId`, `status`, `date`; `expand=patient,doctor,hospital,payment` joins display fields |
| GET | `/api/appointments/:id` | scoped to the caller |
| POST | `/api/appointments` | patient (self) or super admin; validates availability, clashes, hospital approval |
| PATCH | `/api/appointments/:id` | status change; patients may only cancel |
| POST | `/api/appointments/:id/cancel` | booked → cancelled |
| POST | `/api/appointments/:id/complete` | staff only, booked → completed |
| PATCH | `/api/appointments/:id/reschedule` | booked only; re-validates availability and clashes |
| GET | `/api/payments` | filters: `appointmentId` (returns one payment), `patientId`, `hospitalId`, `status` |
| POST | `/api/payments/:appointmentId/pay` | patient pays an online fee (PENDING/FAILED → PAID) |
| POST | `/api/payments/:appointmentId/mark-paid` | hospital admin settles an outstanding pay-at-hospital fee |
| POST | `/api/payments/:appointmentId/mark-failed` | online payment failure |
| GET | `/api/notifications` | caller's own notifications |
| GET | `/api/notifications/unread-count` | returns a bare number |
| POST | `/api/notifications/:id/read` | own notification |
| POST | `/api/notifications/read-all` | marks every own notification read |

### Records and triage

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/medical-records` | patient (own), doctor (authored), super admin; hospital admins get 403 |
| POST | `/api/medical-records` | doctor, for a patient in their care |
| POST | `/api/ai/triage` | patient; keyword rules → specialty, urgency, advice, suggested doctors |
| GET | `/api/ai/recommendations` | patient (own), super admin |
| GET | `/api/doctors/:id/summary` | appointment counts and rating for one doctor |

## Business rules worth knowing

- **Hospital isolation.** A hospital administrator is pinned to their own
  hospital. Asking for another hospital's id is a `403`, not a silent empty
  list.
- **Clinical privacy.** Hospital administrators never receive diagnoses,
  treatments or prescriptions — `GET /api/medical-records` is closed to them.
- **Payments.** Creating an appointment with `ONLINE` records a `PAID` payment
  (no gateway is integrated); `PAY_AT_HOSPITAL` stays `UNPAID_AT_HOSPITAL` until
  a hospital admin settles it. Only outstanding pay-at-hospital fees can be
  settled.
- **Registrations.** A doctor created by a hospital admin starts as
  `PENDING_INVITATION` with no password hash and cannot be booked. Activating
  and deactivating is separate from `isAcceptingPatients`.
- **Appointments.** Bookings are rejected for past dates, unapproved hospitals,
  inactive or invited doctors, times outside published availability, and
  overlapping slots for either the doctor or the patient.

## Two APIs share this folder

`src/` is the standalone Express service documented above; it runs on its own
port with `npm start` and is what the endpoint tables describe.

`api.ts` and `seed.ts` are a different, newer implementation: a Vite plugin
(`apiPlugin()` in `vite.config.ts`) that serves auth and platform-admin routes
from inside the dev server, storing data in `server/data.json`. The two
overlap and should be consolidated into one — until then, treat the Express
API as the reference for the endpoints below and the plugin as the dev-server
transport the frontend currently calls.

## Not implemented

Online payment processing, email/SMS delivery (notifications are in-app rows),
file uploads for medical documents, refresh tokens, rate limiting, and real
database persistence. The AI triage endpoint is a keyword rule set, not a
medical model.

---

# Clinical AI gateway

Dependency-free Node server that proxies the Doctor Portal's AI requests to an
OpenAI-compatible provider. Its only job is to keep the provider API key out of
the browser bundle.

```bash
# 1. Configure (server-side only — never a VITE_* variable)
#    Preferred: put these in the git-ignored .env and `npm run dev:ai`
#    loads it automatically.
AI_API_KEY=...
AI_BASE_URL=https://api.z.ai/api/paas/v4   # default (Z.ai)
AI_CHAT_MODEL=glm-4.5v                     # vision model
AI_TRANSCRIBE_MODEL=glm-asr-2512           # speech model (WAV/MP3)
AI_PORT=8787                               # optional

# 2. Run it next to the frontend
npm run dev:ai    # terminal 1
npm run dev       # terminal 2
```

Vite proxies `/api` to `http://127.0.0.1:8787`, so the browser only ever talks
to its own origin.

## Endpoints

| Method | Path                 | Purpose                                            |
| ------ | -------------------- | -------------------------------------------------- |
| GET    | `/api/ai/status`     | Whether a key is configured, provider, models      |
| POST   | `/api/ai/clinical`   | Patient-context clinical reasoning (JSON in/out)   |
| POST   | `/api/ai/transcribe` | Voice message → text (raw audio body, WAV or MP3)  |

### `/api/ai/clinical`

```jsonc
{
  "task": "PATIENT_HISTORY_SUMMARY | CLINICAL_ANALYSIS | IMAGE_ASSISTANCE | DOCUMENT_SUMMARY | CLINICAL_NOTE_ASSISTANCE | RESULT_COMPARISON | GENERAL_QUESTION",
  "message": "Summarize this patient's history",
  "language": "en",                 // or "am"
  "patient": { "id": "pat-001", "fullName": "…", "dateOfBirth": "1989-04-12" },
  "records": [{ "id": "rec-001", "recordedAt": "…", "diagnosis": "…", "prescription": [] }],
  "appointments": [{ "date": "2026-11-20", "status": "BOOKED" }],
  "attachments": [{ "kind": "image", "name": "lesion.png", "mimeType": "image/png", "dataUrl": "data:image/png;base64,…" }]
}
```

Returns `message`, `generatedSummary`, `observations`, `clinicalConsiderations`,
`redFlags`, `recommendedNextSteps`, `urgency`, `followUpQuestions`,
`limitations`, `sourceRecordIds`, `requiresDoctorReview`, `isDemo: false`.

### `/api/ai/transcribe`

Send the recorded audio as the raw request body with its real `Content-Type`,
and an optional `X-Audio-Language: en|am` header. Returns `{ text, language, model }`.

## Safety behaviour

- The system prompt forbids confirmed diagnoses, prescriptions and dosage
  orders, and requires documented facts to be separated from unconfirmed
  considerations.
- Anything the model returns is normalised so `requiresDoctorReview` is always
  true and limitations always include the review requirement.
- Documents (PDF/text) are **not** parsed: the model is told explicitly that it
  has not read them, and a limitation is added to the response.
- Images are passed as vision inputs, but the prompt forbids treating the output
  as a radiology report or a diagnosis.
- Request bodies are never logged; only method, path, status and latency.

## Before production

This gateway deliberately trusts the caller's record payload so the demo works
without the hospital backend. In production the backend must resolve
`patientId` itself, enforce the doctor's access rights, and ignore any records
sent by the browser. Do not deploy this proxy as the authorisation boundary.
