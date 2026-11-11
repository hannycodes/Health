import { AlertCircle, FileHeart, HeartPulse, Phone, Pill, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Patient } from "@/types";
import { formatDate } from "@/utils/format";
import { ageLabel } from "@/features/doctor/utils";

interface PatientInfoPanelProps {
  patient: Patient;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm">{value?.trim() ? value : "Not recorded"}</dd>
    </div>
  );
}

/**
 * Identity and health panel for a patient.
 *
 * Allergies, conditions and current medications are part of the guide but are
 * NOT in the shared patient model, so they are reported as not recorded rather
 * than invented.
 */
export function PatientInfoPanel({ patient }: PatientInfoPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="text-primary size-4" aria-hidden="true" />
          Patient details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={patient.fullName} />
          <Field label="Patient ID" value={patient.id} />
          <Field
            label="Date of birth"
            value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null}
          />
          <Field label="Age" value={ageLabel(patient.dateOfBirth)} />
          <Field
            label="Gender"
            value={
              patient.gender
                ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()
                : null
            }
          />
          <Field label="Blood type" value={patient.bloodType} />
          <Field label="Phone" value={patient.phone} />
          <Field label="Address" value={patient.address} />
          <Field label="Emergency contact" value={patient.emergencyContact} />
          <Field label="Email" value={patient.email} />
        </dl>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">Important health information</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: AlertCircle, label: "Known allergies" },
              { icon: HeartPulse, label: "Existing conditions" },
              { icon: Pill, label: "Current medications" },
            ].map((item) => (
              <div key={item.label} className="bg-muted/60 rounded-lg border px-3 py-2.5">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <item.icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </p>
                <p className="mt-1 text-xs">
                  Not recorded — no structured field in the shared data model.
                </p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <FileHeart className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Review the medical history timeline for recorded diagnoses, treatments and
            prescriptions.
          </p>
        </div>

        {patient.phone && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Phone className="size-3.5" aria-hidden="true" />
            Contact details are shown from the shared patient profile service.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
