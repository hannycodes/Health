# Component guidelines

## Layers

| Layer                | Location                  | Rule                                                    |
| -------------------- | ------------------------- | ------------------------------------------------------- |
| Primitives           | `src/components/ui`       | shadcn/ui building blocks. No business logic, no data.  |
| Common               | `src/components/common`   | App-wide patterns: PageHeader, EmptyState, ErrorState…  |
| Domain               | `src/components/<domain>` | Shared across roles: AppointmentTable, DoctorCard, etc. |
| Pages                | `src/pages/<role>`        | Compose components, fetch data, own the route.          |
| Layouts              | `src/layouts`             | Sidebar/topbar chrome only.                             |

If two roles need the same widget, it belongs in `src/components/**` and is owned by the
integration lead — not copied into both dashboards.

## Building a page

```tsx
export function SomethingPage() {
  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.appointments.listDetailed({ hospitalId }),
    hospitalId,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="…" description="…" breadcrumbs={[…]} actions={<Button>…</Button>} />

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="…" description="…" />
      ) : (
        <AppointmentTable appointments={data!} perspective="hospital-admin" />
      )}
    </div>
  );
}
```

Every data view handles four states: loading, error, empty, populated.

## Data access

```ts
import { services } from "@/services";

await services.appointments.list({ patientId });
```

- Never import from `src/services/mocks/*` in a page. That breaks the swap to the real API.
- Read hooks: `useServiceQuery(loader, depsKey)`. Results refresh automatically when the
  shared demo store changes, so cross-role updates appear without a reload.
- Mutations: call the service directly, then toast and `refetch()` if the page needs it.
- Current user: `useAuth()` → `{ user, role, hospitalId, login, logout }`.

## Forms

Zod schema + React Hook Form + shadcn field primitives.

```tsx
const schema = z.object({ reason: z.string().min(10, "…") });
type Values = z.infer<typeof schema>;
const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {…} });
```

- Mark invalid inputs with `aria-invalid`.
- Put the field error directly under the field in `text-destructive text-xs`.
- Disable submit while `formState.isSubmitting`.
- Toast on success and on service failure (`getApiErrorMessage(error)`).

## Statuses

Always use `StatusBadge`:

```tsx
<StatusBadge kind="appointment" value={appointment.status} />
<StatusBadge kind="payment" value={payment.status} />
<StatusBadge kind="hospital" value={hospital.approvalStatus} />
```

Labels and colours live in `src/constants`. Do not hard-code status strings or colours in
pages.

## Styling rules

- Tailwind utilities only; semantic tokens (`bg-background`, `text-muted-foreground`,
  `bg-primary`, `bg-secondary`) instead of raw colours.
- Primary = emerald. Amber = warning, red = destructive, sky = informational.
- Cards: `rounded-xl border bg-card shadow-[var(--shadow-card)]` via `<Card>`.
- Section spacing: `space-y-6`; grids: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`.
- Never mix Tailwind v3 config with v4 CSS-first tokens; theme lives in
  `src/styles/index.css`.

## Accessibility

- Icon-only buttons need `aria-label`.
- Dialogs use the shadcn `Dialog` primitives so focus trapping works.
- Forms need a `<Label htmlFor>` for each field.
- Do not remove focus rings; use `focus-visible:` variants.
- Status meaning must be text, not colour alone.

## Ownership

Adding a variant to a `ui/` primitive or a prop to a shared domain component is a shared
change: coordinate with the integration lead so other dashboards do not break.
