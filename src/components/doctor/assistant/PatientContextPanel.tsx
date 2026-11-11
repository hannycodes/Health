import { Link } from "react-router-dom";
import { FileHeart, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MedicalRecord, Patient } from "@/types";
import { formatDate } from "@/utils/format";
import { ageLabel } from "@/features/doctor/utils";

interface PatientContextPanelProps {
  patient: Patient;
  records: MedicalRecord[];
  onClear: () => void;
}

/**
 * Context the assistant is allowed to use for the selected patient. Missing
 * structured fields are reported rather than filled in.
 */
export function PatientContextPanel({ patient, records, onClear }: PatientContextPanelProps) {
  const medications = Array.from(
    new Set(records.flatMap((record) => record.prescription)),
  );

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{patient.fullName}</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {patient.id} · {ageLabel(patient.dateOfBirth)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear patient context"
            onClick={onClear}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Blood {patient.bloodType ?? "not recorded"}</Badge>
          <Badge variant="outline">{records.length} records</Badge>
        </div>

        <dl className="space-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground font-medium">Allergies</dt>
            <dd>Not recorded in the shared data model.</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Existing conditions</dt>
            <dd>Not recorded as a structured field.</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Current medications</dt>
            <dd>{medications.length > 0 ? medications.join(", ") : "None recorded."}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">Most recent consultation</dt>
            <dd>
              {records.length > 0
                ? `${formatDate(records[0].recordedAt.slice(0, 10))} · ${records[0].diagnosis}`
                : "No records yet."}
            </dd>
          </div>
        </dl>

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to={`/doctor/patients/${patient.id}/history`}>
            <FileHeart className="size-4" />
            Open medical history
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
