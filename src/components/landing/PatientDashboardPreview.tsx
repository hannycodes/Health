import { Bell, CalendarDays, FileHeart } from "lucide-react";

/**
 * Illustrative patient dashboard preview.
 *
 * Fictional data only — this is a designed mockup, not live patient
 * information.
 */
export function PatientDashboardPreview() {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_24px_70px_-30px_rgb(11_26_20/0.35)]">
      <div className="bg-muted/60 flex items-center gap-1.5 border-b px-4 py-2.5">
        <span className="size-2 rounded-full bg-red-300" aria-hidden="true" />
        <span className="size-2 rounded-full bg-amber-300" aria-hidden="true" />
        <span className="size-2 rounded-full bg-emerald-300" aria-hidden="true" />
        <span className="text-muted-foreground ml-2 truncate text-[11px]">
          myhealth.et/patient
        </span>
      </div>

      <div className="space-y-3.5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Patient dashboard
            </p>
            <p className="font-display text-sm font-semibold">Good morning, Abebe</p>
          </div>
          <span className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
            AT
          </span>
        </div>

        <div className="border-primary/15 bg-primary/[0.04] rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-primary text-[11px] font-semibold">
              Upcoming appointment
            </p>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              Confirmed
            </span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium">
            Dr. Selamawit Bekele · Cardiology
          </p>
          <p className="text-muted-foreground text-[11px]">
            Addis Care General · Wed, 09:00 – 09:30
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground text-[10px]">Health profile</p>
            <p className="text-[13px] font-semibold">82% complete</p>
            <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[82%] rounded-full" />
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground text-[10px]">Medical records</p>
            <p className="text-[13px] font-semibold">2 available</p>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
              <FileHeart className="size-3" aria-hidden="true" />
              Dermatology · Aug 2026
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-md">
                ✦
              </span>
              AI Navigator
            </p>
            <span className="text-muted-foreground text-[10px]">Guidance</span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            “Chest tightness when climbing stairs”
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Cardiology suggested", "Non-diagnostic", "Next step ready"].map((chip) => (
              <span
                key={chip}
                className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border p-3">
          <CalendarDays className="text-primary size-4" aria-hidden="true" />
          <p className="text-[11px]">
            <span className="font-medium">3 approved hospitals</span>{" "}
            <span className="text-muted-foreground">near Addis Ababa</span>
          </p>
          <Bell className="text-muted-foreground ml-auto size-3.5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
