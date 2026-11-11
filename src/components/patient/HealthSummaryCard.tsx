import { Link } from "react-router-dom";
import { Activity, Ruler, Weight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient } from "@/types";
import {
  BMI_EXPLANATION,
  bmiCategory,
  calculateAge,
  calculateBmi,
  hasHealthProfile,
  toList,
} from "@/utils/health";

interface HealthSummaryCardProps {
  patient: Patient | null;
}

function Measurement({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Weight;
}) {
  return (
    <div className="bg-secondary/50 rounded-lg px-3 py-2">
      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium uppercase">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

export function HealthSummaryCard({ patient }: HealthSummaryCardProps) {
  const age = calculateAge(patient?.dateOfBirth);
  const bmi = calculateBmi(patient?.weightKg, patient?.heightCm);
  const complete = hasHealthProfile(patient);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Health profile</CardTitle>
          <p className="text-muted-foreground text-xs">
            Used to give the AI Assistant relevant context.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/patient/profile">{complete ? "Edit" : "Complete"}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Measurement
            label="Age"
            value={age !== undefined ? `${age} yrs` : "Not set"}
            icon={Activity}
          />
          <Measurement
            label="Weight"
            value={patient?.weightKg ? `${patient.weightKg} kg` : "Not set"}
            icon={Weight}
          />
          <Measurement
            label="Height"
            value={patient?.heightCm ? `${patient.heightCm} cm` : "Not set"}
            icon={Ruler}
          />
          <Measurement
            label="BMI"
            value={bmi !== null ? bmi.toFixed(1) : "—"}
            hint={bmi !== null ? bmiCategory(bmi) : undefined}
            icon={Activity}
          />
        </div>

        {bmi !== null ? (
          <p className="text-muted-foreground text-[11px]">{BMI_EXPLANATION}</p>
        ) : (
          <div className="border-border/70 bg-muted/40 flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Add your date of birth, weight and height to see a BMI estimate and give
              the AI Assistant useful context.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/patient/profile">Complete health profile</Link>
            </Button>
          </div>
        )}

        {(toList(patient?.allergies).length > 0 || toList(patient?.conditions).length > 0) && (
          <div className="text-xs">
            <span className="font-medium">On file: </span>
            <span className="text-muted-foreground">
              {[
                toList(patient?.allergies).length
                  ? `Allergies — ${toList(patient?.allergies).join(", ")}`
                  : null,
                toList(patient?.conditions).length
                  ? `Conditions — ${toList(patient?.conditions).join(", ")}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
