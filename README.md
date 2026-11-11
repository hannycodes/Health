# MyHealth — Frontend

AI-assisted healthcare navigation and appointment coordination platform, built for a
five-person hackathon team.

This repository contains the **frontend only**. The backend API is developed separately
and is not required to run the demo: the UI currently runs on a shared, persistent mock
service layer.

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

## Demo accounts

Password for every account: `demo1234`

| Role           | Email                 | Profile                          |
| -------------- | --------------------- | -------------------------------- |
| Patient        | `patient@myhealth.et` | Abebe Tesfaye                    |
| Doctor         | `doctor@myhealth.et`  | Dr. Selamawit Bekele, Cardiology  |
| Hospital Admin | `hospital@myhealth.et`| Hanna Solomon, Addis Care        |
| Super Admin    | `admin@myhealth.et`   | Daniel Fikru                     |

The login page has one-click buttons that fill these credentials.

> Frontend role guards are a UX convenience only. Real authorization must be enforced by
> the backend.

## Demo data model

All services resolve through `src/services/index.ts`. The mock implementation stores
everything in one `localStorage`-backed database (`src/services/mocks/store.ts`), so an
appointment booked by a patient is immediately visible to the doctor and hospital admin.

Reset the demo dataset from the user menu → **Reset demo data**, or clear
`myhealth:demo-db:v1` from local storage.

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable            | Default                     | Meaning                                   |
| ------------------- | --------------------------- | ----------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Backend base URL used by the Axios client |
| `VITE_DATA_SOURCE`  | `mock`                      | `mock` (demo) or `http` (placeholder API) |

Never place API keys, JWT signing secrets, payment keys or database passwords in the
frontend environment — anything prefixed `VITE_` is public in the bundle.

## Project structure

```
src/
  components/
    ui/            shadcn/ui primitives (design system layer)
    common/        PageHeader, EmptyState, ErrorState, StatusBadge, StatCard, ...
    navigation/    Sidebar, Topbar, UserMenu, NotificationsMenu, MobileNav, navConfig
    appointments/  Shared AppointmentTable, BookAppointmentDialog
    doctors/       DoctorCard
    hospitals/     HospitalCard
  contexts/        AuthContext
  data/            Seed data, demo accounts, database shape
  hooks/           useAuth, useServiceQuery, useDemoRevision
  layouts/         AuthLayout + four role layouts (DashboardShell)
  lib/             http (Axios), session, utils (cn)
  pages/           auth/, patient/, shared/
  routes/          AppRoutes, ProtectedRoute, RootRedirect
  services/        interfaces/, mocks/, api/ (HTTP placeholders)
  styles/          Tailwind v4 theme and tokens
  test/            Vitest setup and foundation tests
  types/           Shared domain contracts
  constants/       Roles, status metadata, storage keys
  utils/           Formatting helpers
```

## What is implemented and what is not

Implemented: design system, brand/theme, shared layouts and navigation, auth + role
guards, patient screens (dashboard, hospitals, doctors, AI navigator, appointments,
medical history, profile), appointment booking/cancel flow, shared appointment service
with cross-role visibility, seeded demo data, tests.

Scaffolded for the feature owners: doctor, hospital admin and super admin screens render
a `ScaffoldPage` placeholder inside their real layout and navigation. See
`FRONTEND_TASK_ASSIGNMENTS.md`.

Backend endpoints, real authentication, AI triage and online payment are **not** built.
The HTTP adapters in `src/services/api/httpServices.ts` are provisional placeholders.

## Documentation

- `FRONTEND_CONTRIBUTING.md` — workflow, conventions, PR expectations
- `FRONTEND_TASK_ASSIGNMENTS.md` — ownership by developer and branch
- `COMPONENT_GUIDELINES.md` — reusable component and data-access rules
