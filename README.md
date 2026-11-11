# MyHealth — Frontend

AI-assisted healthcare navigation and appointment coordination platform, built for a
five-person hackathon team.

This repository contains the React frontend plus a local API backend for authentication
and the platform-administration portal. The API is served by Vite during development
(see `server/`) and persists its data to `server/data.json`. Shared patient-side flows
(appointments, payments, medical records and AI triage) still resolve through the
in-browser mock service layer until those endpoints are added.

## Stack

React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · shadcn/ui · React Router 7 ·
Axios · React Hook Form · Zod · Lucide React · Vitest · React Testing Library

## Quick start

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open the printed URL (default <http://localhost:5173>). The app redirects to `/login`.

### Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the Vite dev server with HMR        |
| `npm run build`     | Type-check (`tsc --noEmit`) then build    |
| `npm run preview`   | Serve the production build locally        |
| `npm run lint`      | Run ESLint over the repository            |
| `npm run test`      | Run the Vitest suite once                 |
| `npm run test:watch`| Run Vitest in watch mode                  |

## Development accounts

The local API seeds these accounts on first run. Password for every account:
`myhealth123`

| Role           | Email                 | Profile                          |
| -------------- | --------------------- | -------------------------------- |
| Patient        | `patient@myhealth.et` | Abebe Tesfaye                    |
| Doctor         | `doctor@myhealth.et`  | Dr. Selamawit Bekele, Cardiology  |
| Hospital Admin | `hospital@myhealth.et`| Hanna Solomon, Addis Care        |
| Super Admin    | `admin@myhealth.et`   | Super Admin                      |

Authentication, hospital directories, platform users, administrators, audit logs,
analytics, settings and notifications are served by the API. API sessions are enforced
server-side; frontend role guards remain a UX convenience.

## Data and storage

All services resolve through `src/services/index.ts`. Auth and platform administration
call the API in `server/api.ts`; every other feature uses the mock implementation in
`src/services/mocks/`, which stores its data in one `localStorage` database. The API
persists to `server/data.json` (gitignored) and can be reset by deleting that file while
the dev server is stopped.

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable            | Default                     | Meaning                                   |
| ------------------- | --------------------------- | ----------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                      | Backend base URL used by the Axios client |
| `VITE_DATA_SOURCE`  | `hybrid`                    | `hybrid` (default), `mock` (all in-browser) or `http` (all API) |

Never place API keys, JWT signing secrets, payment keys or database passwords in the
frontend environment — anything prefixed `VITE_` is public in the bundle.

## Project structure

```
server/            Local API (Vite middleware) and its seed dataset
src/
  components/
    branding/      Logo component (official logo asset)
    images/        logo.png (official brand asset)
    landing/       Public landing page navbar, footer and sections
    ui/            shadcn/ui primitives (design system layer)
    common/        PageHeader, EmptyState, ErrorState, StatusBadge, StatCard, ...
    navigation/    Sidebar, Topbar, UserMenu, NotificationsMenu, MobileNav, navConfig
    appointments/  Shared AppointmentTable, BookAppointmentDialog
    doctors/       DoctorCard
    hospitals/     HospitalCard
  contexts/        AuthContext
  data/            Mock seed data, development accounts, database shape
  hooks/           useAuth, useServiceQuery, useDemoRevision
  layouts/         AuthLayout + four role layouts (DashboardShell)
  lib/             http (Axios), session, utils (cn)
  pages/           auth/, patient/, shared/
  routes/          AppRoutes, ProtectedRoute, RootRedirect
  services/        interfaces/, mocks/, api/ (HTTP adapters)
  styles/          Tailwind v4 theme and tokens
  test/            Vitest setup and foundation tests
  types/           Shared domain contracts
  constants/       Roles, status metadata, storage keys
  utils/           Formatting helpers
```

## What is implemented and what is not

Implemented: official logo integration, custom stethoscope favicon, public landing page,
design system, brand/theme, shared layouts and navigation, shared authentication (login,
patient registration, forgot/reset password, pending-account states) with session
handling, role-based routing and guards, patient screens (dashboard, hospitals, doctors,
AI navigator, appointments, medical history, profile), appointment booking/cancel flow,
shared appointment service with cross-role visibility, the Super Admin portal
(platform dashboard, hospital approvals, user and administrator management, analytics,
read-only audit log, notifications, settings), the local API backend, seeded
development data, tests.

Public routes: `/` renders the landing page, and `/login`, `/register`,
`/forgot-password`, `/reset-password`, `/account-pending` and `/unauthorized` make up the
shared authentication flow. Authenticated routes live under `/patient`, `/doctor`,
`/hospital-admin` and `/admin` (the previous `/super-admin` URLs redirect to `/admin`).

Scaffolded for the feature owners: doctor and hospital admin screens render a
`ScaffoldPage` placeholder inside their real layout and navigation; the Super Admin
portal is fully implemented. See `FRONTEND_TASK_ASSIGNMENTS.md`.

The local API implements authentication, hospitals, doctors, patients, platform users,
administrators, audit logs, analytics, settings and notifications. Appointment, payment,
medical-record and AI-triage endpoints are **not** built yet; those HTTP adapters in
`src/services/api/httpServices.ts` are still provisional.

## Documentation

- `FRONTEND_CONTRIBUTING.md` — workflow, conventions, PR expectations
- `FRONTEND_TASK_ASSIGNMENTS.md` — ownership by developer and branch
- `COMPONENT_GUIDELINES.md` — reusable component and data-access rules
