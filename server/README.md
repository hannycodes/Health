# MyHealth API

The single backend for MyHealth: Node.js + Express, serving the same domain
contracts the frontend defines in `src/types`.

It replaces the earlier Vite-plugin API that used to live in this folder
(`api.ts` / `seed.ts`). Those files are gone; Vite now proxies `/api` to this
service during development, so there is one implementation and one data file.

Data lives in a JSON file (`server/data/db.json`, created and seeded on first
start, gitignored). The store is isolated in `src/db.js`: replacing it with
PostgreSQL later means changing that module, not the routes.

## Running

```bash
# first time only
npm run api:install      # installs the server's dependencies

# in one terminal
npm run api              # http://localhost:8000

# in another
npm run dev              # Vite on :5173, proxying /api to :8000
```

Health check: `GET /api/health`. Point the frontend somewhere else with
`VITE_API_BASE_URL`, or change the proxy target with `VITE_API_PROXY_TARGET`.

Server-specific settings live in `server/.env` (see `.env.example`):
`PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_SHORT_EXPIRES_IN`, `CORS_ORIGIN`,
`DATA_DIR`, `DEV_SEED_PASSWORD`.

## Seeded accounts

Every account uses `myhealth123` (override with `DEV_SEED_PASSWORD` before the
first start, since hashes are created at seed time).

| Email | Role | Notes |
| --- | --- | --- |
| `patient@myhealth.et` | PATIENT | pat-001 |
| `doctor@myhealth.et` | DOCTOR | doc-001, hsp-001 |
| `hospital@myhealth.et` | HOSPITAL_ADMIN | adm-001, hsp-001 |
| `getachew.bekele@myhealth.et` | HOSPITAL_ADMIN | adm-002, hsp-002 |
| `admin@myhealth.et` | SUPER_ADMIN | platform-wide |
| `sara.bekele@example.com` | PATIENT | suspended, to test the blocked-login path |
| `meron.tesfaye@myhealth.et` | HOSPITAL_ADMIN | pending, assigned to the pending hospital |

## Authentication

`POST /api/auth/login` returns `{ user, token, hospitalId, expiresAt }`. Send the
token as `Authorization: Bearer <token>` on every other request. `remember:
false` issues a one-hour session instead of the twelve-hour default.

Rejections carry a stable `code` the UI switches on: `INVALID_CREDENTIALS`,
`ACCOUNT_PENDING`, `ACCOUNT_SUSPENDED`, `ACCOUNT_DISABLED`,
`HOSPITAL_PENDING` / `HOSPITAL_REJECTED` / `HOSPITAL_SUSPENDED`,
`SESSION_EXPIRED`, `EMAIL_TAKEN`, `RESET_TOKEN_INVALID`.

The user record is reloaded on each request, so a suspended account or a
hospital that loses approval takes effect immediately. Password hashes are never
returned.

## Endpoints

### Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/register` | public; patient self-registration with consent flags |
| POST | `/api/auth/forgot-password` | public; always answers `{}` |
| POST | `/api/auth/reset-password` | public; consumes a reset token |
| POST | `/api/auth/logout` | any signed-in user |
| GET | `/api/auth/me` | any signed-in user |

### Directory

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/hospitals` | any (hospital admins see only their own) |
| GET | `/api/hospitals/:id` | any, scoped |
| PATCH | `/api/hospitals/:id` | hospital admin (own), super admin |
| PATCH | `/api/hospitals/:id/approval` | super admin; `{status, reason?, reactivate?}`, audited |
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
| POST/PATCH/DELETE | `/api/availability[/:id]` | doctor (self), hospital admin |
| GET | `/api/patients` | doctor, hospital admin, super admin |
| GET | `/api/patients/me` | any signed-in user |
| GET | `/api/patients/:id` | patient (self), doctor in care, hospital admin with a visit |
| PATCH | `/api/patients/:id` | patient (self) |

### Scheduling

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/appointments` | filters: `patientId`, `doctorId`, `hospitalId`, `status`, `date`; `expand=...` adds joined display fields |
| GET | `/api/appointments/:id` | scoped to the caller |
| POST | `/api/appointments` | patient (self) or super admin; validates availability, clashes, hospital approval |
| PATCH | `/api/appointments/:id` | status change; patients may only cancel |
| POST | `/api/appointments/:id/cancel` | booked → cancelled |
| POST | `/api/appointments/:id/complete` | staff only |
| PATCH | `/api/appointments/:id/reschedule` | booked only; re-validates |
| GET | `/api/payments` | filters: `appointmentId` (single payment), `patientId`, `hospitalId`, `status` |
| POST | `/api/payments/:appointmentId/pay` | patient pays an online fee |
| POST | `/api/payments/:appointmentId/mark-paid` | hospital admin settles an outstanding fee |
| POST | `/api/payments/:appointmentId/mark-failed` | online payment failure |
| GET | `/api/notifications` | caller's own |
| GET | `/api/notifications/unread-count` | bare number |
| POST | `/api/notifications/:id/read`, `/api/notifications/read-all` | own notifications |

### Records and triage

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/medical-records` | patient (own), doctor (authored), super admin; hospital admins get 403 |
| POST | `/api/medical-records` | doctor, for a patient in their care |
| POST | `/api/ai/triage` | patient; keyword rules → specialty, urgency, advice |
| GET | `/api/ai/recommendations` | patient (own), super admin |
| GET | `/api/doctors/:id/summary` | appointment counts and rating |

### Platform administration (super admin only)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/users` | filters: `role`, `status`, `hospitalId`, `search` |
| GET | `/api/admin/users/:id` | |
| PATCH | `/api/admin/users/:id/status` | reason required to suspend/disable; audited |
| GET | `/api/admin/administrators` | filters: `status`, `hospitalId`, `search` |
| POST | `/api/admin/administrators/invite` | approved hospitals only; returns a temporary password |
| GET | `/api/admin/administrators/:id` | |
| PATCH | `/api/admin/administrators/:id/hospital` | reassignment, audited |
| PATCH | `/api/admin/administrators/:id/status` | reason required to suspend/disable |
| GET | `/api/admin/audit-logs` | filters: `action`, `search`, `from`, `to` |
| GET | `/api/admin/analytics/summary` | platform totals |
| GET | `/api/admin/analytics/growth` | `range=7d\|30d\|90d\|custom` |
| GET/PATCH | `/api/admin/settings` | updates are audited |

## Business rules worth knowing

- **Hospital isolation.** A hospital administrator is pinned to their own
  hospital; another hospital's id is a `403`, not a silent empty list.
- **Clinical privacy.** Hospital administrators never receive diagnoses,
  treatments or prescriptions.
- **Payments.** `ONLINE` bookings record a `PAID` payment (no gateway is
  integrated); `PAY_AT_HOSPITAL` stays `UNPAID_AT_HOSPITAL` until an
  administrator settles it. Only outstanding fees can be settled.
- **Registrations.** A doctor created by a hospital admin starts as
  `PENDING_INVITATION` with no password hash and cannot be booked.
- **Appointments.** Bookings are rejected for past dates, unapproved hospitals,
  inactive or invited doctors, times outside published availability, and
  overlapping slots for either the doctor or the patient.
- **Audit trail.** Approval decisions, account status changes, administrator
  invitations/reassignments and settings updates append an audit entry whose
  actor comes from the token, never the request body.

## Not implemented

Payment processing, e-mail/SMS delivery (reset tokens are stored but never
sent), file upload for verification documents, refresh tokens, rate limiting,
and real database persistence. AI triage is a keyword rule set, not a medical
model.
