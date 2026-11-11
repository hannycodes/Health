import { Check, FileText, Sparkles, Stethoscope } from "lucide-react";

/**
 * Illustrative doctor dashboard preview with a clearly labelled AI draft.
 * Fictional data only.
 */
export function DoctorDashboardPreview() {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_24px_70px_-30px_rgb(11_26_20/0.3)]">
      <div className="bg-muted/60 flex items-center gap-1.5 border-b px-3.5 py-2.5">
        <span className="size-2 rounded-full bg-red-300" aria-hidden="true" />
        <span className="size-2 rounded-full bg-amber-300" aria-hidden="true" />
        <span className="size-2 rounded-full bg-emerald-300" aria-hidden="true" />
        <span className="text-muted-foreground ml-2 truncate text-[11px]">
          myhealth.et/doctor
        </span>
      </div>

      <div className="space-y-3.5 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
            SB
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">Dr. Selamawit Bekele</p>
            <p className="text-muted-foreground text-[10px]">
              Cardiology · Addis Care General
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold">Today’s schedule</p>
            <span className="text-muted-foreground text-[10px]">4 patients</span>
          </div>
          <div className="space-y-1.5">
            {[
              { time: "08:30", name: "Hana Girma", reason: "Chest tightness" },
              { time: "09:00", name: "Abebe Tesfaye", reason: "BP follow-up" },
            ].map((slot) => (
              <div
                key={slot.time}
                className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2"
              >
                <span className="text-primary bg-primary/10 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  {slot.time}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium">{slot.name}</p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    {slot.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-primary/20 bg-primary/[0.035] rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-primary flex items-center gap-1.5 text-[11px] font-semibold">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI clinical assistant
            </p>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-amber-800 uppercase">
              For clinician review
            </span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-[10px] leading-relaxed">
            Draft summary of authorized history: hypertension managed since 2023,
            reports intermittent headaches. No medication changes recorded.
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium">
              <Check className="size-3" aria-hidden="true" />
              Review
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px]">
              <FileText className="size-3" aria-hidden="true" />
              Edit draft
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border p-2.5">
          <Stethoscope className="text-primary size-3.5" aria-hidden="true" />
          <p className="text-[10px]">
            <span className="font-medium">Next:</span>{" "}
            <span className="text-muted-foreground">complete clinical note</span>
          </p>
        </div>
      </div>
    </div>
  );
}
