import { FileHeart, Pill } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDateTime } from "@/utils/format";

export function PatientMedicalHistory() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";

  const records = useServiceQuery(
    () => services.medicalRecords.listByPatient(patientId),
    patientId,
  );
  const doctors = useServiceQuery(() => services.doctors.list(), "doctors");
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const rows = records.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical history"
        description="Consultation notes and prescriptions recorded by your doctors."
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "Medical history" },
        ]}
      />

      {records.isLoading ? (
        <ListSkeleton rows={2} />
      ) : records.error ? (
        <ErrorState message={records.error} onRetry={() => records.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileHeart}
          title="No medical records yet"
          description="Records appear here after a completed consultation."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((record) => {
            const doctor = doctors.data?.find((item) => item.id === record.doctorId);
            const hospital = hospitals.data?.find(
              (item) => item.id === record.hospitalId,
            );

            return (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{record.diagnosis}</CardTitle>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {doctor?.fullName ?? "Unknown doctor"}
                        {hospital ? ` · ${hospital.name}` : ""} ·{" "}
                        {formatDateTime(record.recordedAt)}
                      </p>
                    </div>
                    <Badge variant="outline">Record</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase">
                      Treatment
                    </p>
                    <p>{record.treatment}</p>
                  </div>
                  {record.prescription.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase">
                        Prescription
                      </p>
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
                      <p className="text-muted-foreground text-xs font-medium uppercase">
                        Notes
                      </p>
                      <p className="text-muted-foreground">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
