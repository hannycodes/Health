import { Link } from "react-router-dom";
import { FileHeart, Pill } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate } from "@/utils/format";

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
        description="Consultation notes, results and prescriptions recorded by your doctors."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Medical history" }]}
        actions={
          rows.length > 0 ? <Badge variant="secondary">{rows.length} records</Badge> : undefined
        }
      />

      {records.isLoading ? (
        <ListSkeleton rows={3} />
      ) : records.error ? (
        <ErrorState message={records.error} onRetry={records.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileHeart}
          title="No medical records yet"
          description="Records appear here after a completed consultation."
          action={
            <Button size="sm" asChild>
              <Link to="/patient/doctors">Find a doctor</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((record) => {
            const doctor = doctors.data?.find((item) => item.id === record.doctorId);
            const hospital = hospitals.data?.find((item) => item.id === record.hospitalId);

            return (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{record.diagnosis}</CardTitle>
                      <p className="text-muted-foreground text-xs">
                        {doctor?.fullName ?? "Unknown doctor"}
                        {hospital ? ` · ${hospital.name}` : ""} ·{" "}
                        {formatDate(record.recordedAt.slice(0, 10))}
                      </p>
                    </div>
                    <Badge variant="outline">{record.recordType ?? "Consultation"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-[11px] font-medium uppercase">
                      Summary
                    </p>
                    <p>{record.treatment}</p>
                  </div>
                  {record.prescription.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-[11px] font-medium uppercase">
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
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/patient/medical-history/${record.id}`}>View full record</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
