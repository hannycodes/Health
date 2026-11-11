import { UserRound } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/types";

interface PatientContextSelectorProps {
  patients: Patient[];
  selectedPatientId?: string;
  onChange: (patientId: string | undefined) => void;
  disabled?: boolean;
}

/** Only patients the doctor is authorized for are listed here. */
export function PatientContextSelector({
  patients,
  selectedPatientId,
  onChange,
  disabled,
}: PatientContextSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="patient-context">Select patient</Label>
      <Select
        value={selectedPatientId ?? "none"}
        onValueChange={(value) => onChange(value === "none" ? undefined : value)}
        disabled={disabled}
      >
        <SelectTrigger id="patient-context">
          <SelectValue placeholder="No patient selected" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No patient (general question)</SelectItem>
          {patients.map((patient) => (
            <SelectItem key={patient.id} value={patient.id}>
              {patient.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <UserRound className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Only patients linked to your appointments or records can be selected.
      </p>
    </div>
  );
}
