import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doctor, Hospital, MedicalRecord } from "@/types";
import { formatDateTime } from "@/utils/format";

interface MedicalRecordCardProps {
  records: MedicalRecord[];
  doctors: Doctor[];
  hospitals: Hospital[];
  patientId: string;
  emptyDescription?: string;
}

/** Compact record list used on the patient overview page. */
export function MedicalRecordCard({
  records,
  doctors,
  hospitals,
  patientId,
  emptyDescription = "Clinical records created during consultations will appear here.",
}: MedicalRecordCardProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No clinical records yet"
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-3">
      {records.slice(0, 4).map((record) => {
        const doctor = doctors.find((item) => item.id === record.doctorId);
        const hospital = hospitals.find((item) => item.id === record.hospitalId);

        return (
          <Card key={record.id}>
            <CardHeader className="pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">
                    {record.diagnosis || "Consultation record"}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {doctor?.fullName ?? "Unknown doctor"}
                    {hospital ? ` · ${hospital.name}` : ""} ·{" "}
                    {formatDateTime(record.recordedAt)}
                  </p>
                </div>
                <Badge variant="outline">Record</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-3 text-sm">
              {record.treatment && <p>{record.treatment}</p>}
              <Button variant="outline" size="sm" asChild>
                <Link to={`/doctor/patients/${patientId}/records/${record.id}`}>
                  Open record
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
