# Frontend contributing guide

Team conventions for the five-person MyHealth frontend. Agree on changes here before
inventing a new pattern.

## Branches

Branch from `main`, one branch per developer, keep it alive for the hackathon:

```
feature/patient-dashboard
feature/doctor-dashboard
feature/hospital-admin
feature/auth-superadmin
feature/ai-navigator
```

Pull `main` before starting work and before opening a PR. Do not commit directly to
`main`; do not force-push shared branches.

## Commits

Conventional commits, scoped to the area you touched:

```
feat(patient): allow cancelling a booked appointment
fix(doctor): show correct patient name in appointment table
chore(frontend): initialize MyHealth frontend foundation
```

One logical change per commit. Run `npm run lint`, `npm run test` and `npm run build`
before pushing.

## Pull requests

- Title follows the commit convention, description says what and why.
- Keep PRs under ~400 changed lines where possible.
- Never edit another developer's owned files (see `FRONTEND_TASK_ASSIGNMENTS.md`);
  request the change instead, or ask the integration lead.
- A PR that changes `src/types`, `src/services/interfaces`, `src/routes/AppRoutes.tsx`
  or a shared component needs the integration lead's review.
- Include a screenshot for visible UI changes.
- All checks must pass, tests must not be disabled to make a build green.

## Coding conventions

- TypeScript strict mode is on. No `any`, no `@ts-ignore`, no non-null assertions to
  silence a real error.
- Import with the `@/` alias (`@/components/ui/button`), never long relative chains.
- Function components with named exports (`export function PatientDashboard()`), no
  default exports except where a framework requires them.
- Keep components under ~200 lines. Extract a subcomponent rather than nesting deeply.
- Data access goes through `services` from `@/services` — never import mock data
  directly in a page.
- Prefer the hooks: `useServiceQuery` for reads, `useAuth` for the session.
- Validate every form with Zod + React Hook Form, show inline field errors and a toast on
  success/failure.
- Use `sonner` (`toast.success` / `toast.error`) for transient feedback.
- Never commit secrets. Only `VITE_*` values may reach the browser, and they are public.

## UI rules

- Use `src/components/ui/*` primitives; do not fork them into dashboard folders.
- Use `PageHeader` at the top of every page and `StatusBadge` for all statuses.
- Emerald is the only primary brand colour. Semantic colours: success = emerald,
  warning = amber, danger = red, info = sky. Never encode meaning with colour alone —
  pair it with a label.
- Use Lucide icons at `size-4` inside buttons and `size-3.5` inline with text.
- Layout: `space-y-6` between page sections, cards `rounded-xl` with the default shadow.
- Every data view needs loading, empty and error states (see `ListSkeleton`,
  `EmptyState`, `ErrorState`).
- Interactive elements need an accessible name; icon-only buttons need `aria-label`.

## Testing

- Place tests in `src/test/*.test.tsx` (or next to the feature).
- Cover behaviour that spans roles or services, not every presentational detail.
- Reset the demo store in `beforeEach` (`demoDb.reset()`) — mock services are singletons.
- `npm run test` must pass before merging.

## Mock data rules

- Fictional data only. No real patient information, ever.
- Keep IDs consistent between seed records (`pat-001`, `doc-001`, `hsp-001`) so
  cross-role links keep working.
- Add new demo records in `src/data/seed.ts`, not inside components.
