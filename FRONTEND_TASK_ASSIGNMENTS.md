# Frontend task assignments

Five developers, five branches. The integration lead owns the shared foundation; feature
owners only edit their own folders.

## Shared foundation — integration lead (owner of record)

**Owns and reviews changes to:**

```
src/types/**                     src/services/interfaces/**
src/constants/**                 src/services/index.ts
src/lib/**                       src/services/mocks/store.ts
src/hooks/**                     src/contexts/**
src/routes/**                    src/layouts/**
src/components/ui/**             src/components/navigation/**
src/components/common/**         src/main.tsx, src/App.tsx
src/styles/**                    package.json, vite.config.ts, tsconfig.json, eslint.config.js
src/data/**                      README and team docs
```

Only the integration lead merges changes to `src/types`, service interfaces, route tree,
shared UI primitives, design tokens and mock seed data — these ripple across all five
roles.

## 1. Patient experience — `feature/patient-dashboard`

Owns: `src/pages/patient/**`, `src/components/appointments/**`,
`src/components/doctors/DoctorCard.tsx`, `src/components/hospitals/HospitalCard.tsx`.

Done: dashboard, hospitals list, doctor directory, appointments (book/cancel),
medical history, profile.

Next: reschedule flow, payment receipt view, doctor detail page, appointment filters and
sorting, empty/error polish.

## 2. Doctor workspace — `feature/doctor-dashboard`

Owns: `src/pages/doctor/**`.

Create: dashboard (today's schedule, upcoming, counts), appointments list with
complete/cancel actions, patient list derived from appointments, availability editor
(uses `doctorService.listAvailability/saveAvailability/removeAvailability`), profile
(bio, fee, accepting patients).

Route placeholders already exist in `src/routes/AppRoutes.tsx`; replace the
`ScaffoldPage` element for each `doctor/*` path with your page component.

## 3. Hospital administration — `feature/hospital-admin`

Owns: `src/pages/hospital-admin/**`.

Create: dashboard (appointments today, doctor count, bed occupancy, unpaid payments),
doctor roster (`hospitalId` from `useAuth()`), appointments table with
"mark paid at hospital", hospital profile form, capacity editor
(`hospitalService.updateCapacity`).

## 4. Authentication and super admin — `feature/auth-superadmin`

Owns: `src/pages/auth/**`, `src/pages/super-admin/**`.

Create: super admin dashboard (network metrics), hospitals table with approval status,
users table, approval queue with approve/reject (`hospitalService.setApprovalStatus`).
Later: replace the mock auth provider with the backend session flow, keeping the
`AuthService` interface intact.

## 5. AI navigator — `feature/ai-navigator`

Owns: `src/pages/patient/PatientAiNavigator.tsx`, `src/services/mocks/clinicalServices.ts`
(AI section only).

Done: symptom form, deterministic rule-based triage, recommendation history.

Next: real AI endpoint integration through `AINavigatorService`, richer recommendations
(specialty + hospital + doctor cards with booking links), urgency explanations, symptom
chips, safety disclaimers.

## Interface contract checklist

Before changing any of these, announce it in the team channel and get the integration
lead's review:

- `src/types/index.ts` (User, Doctor, Hospital, Appointment, Payment, ...)
- `src/services/interfaces/index.ts`
- `src/routes/AppRoutes.tsx` (paths are referenced by navigation and notifications)
- `src/constants/index.ts` (role home paths, status metadata)

Add new endpoints to `src/services/api/httpServices.ts` only after API_CONTRACT.md is
agreed with the backend owner.
