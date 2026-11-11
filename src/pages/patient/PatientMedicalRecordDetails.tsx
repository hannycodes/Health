import { Link, useParams } from "react-router-dom";
import { Pill } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDateTime } from "@/utils/format";

export function PatientMedicalRecordDetails() {
  const { id = "" } = useParams();

  const detailsQuery = useServiceQuery(async () => {
    const record = await services.medicalRecords.getById(id);
    if (!record) return null;
    const [doctor, hospital] = await Promise.all([
      services.doctors.getById(record.doctorId),
      services.hospitals.getById(record.hospitalId),
    ]);
    return { record, doctor, hospital };
  }, id);

  const details = detailsQuery.data;

  if (detailsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Medical record"
          breadcrumbs={[{ label: "Medical history", to: "/patient/medical-history" }]}
        />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (detailsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Medical record"
          breadcrumbs={[{ label: "Medical history", to: "/patient/medical-history" }]}
        />
        <ErrorState message={detailsQuery.error} onRetry={detailsQuery.refetch} />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Record not found"
          breadcrumbs={[{ label: "Medical history", to: "/patient/medical-history" }]}
        />
        <EmptyState
          title="This record is not available"
          description="It may belong to another account or have been removed."
          action={
            <Button asChild size="sm">
              <Link to="/patient/medical-history">Back to medical history</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { record, doctor, hospital } = details;

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.diagnosis}
        description={`${record.recordType ?? "Consultation"} · ${formatDateTime(record.recordedAt)}`}
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "Medical history", to: "/patient/medical-history" },
          { label: "Record" },
        ]}
        actions={<Badge variant="outline">{record.recordType ?? "Consultation"}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground text-[11px] uppercase">Recorded by</p>
              <p>{doctor?.fullName ?? "Unknown doctor"}</p>
              <p className="text-muted-foreground text-xs">{doctor?.specialty}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] uppercase">Hospital</p>
              <p>{hospital?.name ?? "Unknown hospital"}</p>
              {hospital && <p className="text-muted-foreground text-xs">{hospital.city}</p>}
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] uppercase">Assessment</p>
              <p>{record.diagnosis}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] uppercase">Treatment</p>
              <p>{record.treatment}</p>
            </div>
            {record.prescription.length > 0 && (
              <div>
                <p className="text-muted-foreground text-[11px] uppercase">Prescription</p>
                <ul className="mt-1 space-y-1">
                  {record.prescription.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Pill className="text-primary mt-0.5 size-3.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {record.notes && (
              <div>
                <p className="text-muted-foreground text-[11px] uppercase">Notes</p>
                <p className="text-muted-foreground">{record.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">About this record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              Records are written by your care team. MyHealth does not let patients edit
              clinical records — contact the hospital if something looks wrong.
            </p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/patient/medical-history">Back to medical history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
