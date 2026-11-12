import { Link, useParams } from "react-router-dom";
import { ClipboardPlus, FileHeart, Paperclip } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { ClinicalSummaryPanel } from "@/components/doctor/ClinicalSummaryPanel";
import { MedicalHistoryTimeline } from "@/components/doctor/MedicalHistoryTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorizedPatient } from "@/features/doctor/services/doctorAccess";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function DoctorPatientHistoryPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const doctorId = user?.id ?? "";

  const patient = useServiceQuery(
    () => getAuthorizedPatient(doctorId, id),
    `${doctorId}:${id}`,
  );
  const records = useServiceQuery(
    () => services.medicalRecords.listByPatient(id),
    `${doctorId}:${id}`,
  );
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ doctorId, patientId: id }),
    `${doctorId}:${id}`,
  );
  const doctors = useServiceQuery(() => services.doctors.list(), "doctors");
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const refetchAll = () => {
    records.refetch();
    appointments.refetch();
  };

  if (patient.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Medical history" description="Loading patient history…" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (patient.error || !patient.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Medical history"
          breadcrumbs={[
            { label: "Doctor", to: "/doctor" },
            { label: "Patients", to: "/doctor/patients" },
            { label: "Restricted" },
          ]}
        />
        {patient.error ? (
          <ErrorState
            title="Unable to open this history"
            message={patient.error}
            onRetry={patient.refetch}
          />
        ) : (
          <EmptyState
            icon={FileHeart}
            title="History not available"
            description="You do not have an active care relationship with this patient."
            action={
              <Button asChild>
                <Link to="/doctor/patients">Back to patients</Link>
              </Button>
            }
          />
        )}
      </div>
    );
  }

  const detail = patient.data;
  const hospitalId = doctors.data?.find((item) => item.id === doctorId)?.hospitalId ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Medical history · ${detail.fullName}`}
        description="Consultations and appointments in chronological order, most recent first. Only fields stored in the shared medical record model are shown."
        breadcrumbs={[
          { label: "Doctor", to: "/doctor" },
          { label: "Patients", to: "/doctor/patients" },
          { label: detail.fullName, to: `/doctor/patients/${detail.id}` },
          { label: "History" },
        ]}
        actions={
          <Button asChild>
            <Link to={`/doctor/patients/${detail.id}/records/new`}>
              <ClipboardPlus className="size-4" />
              New clinical record
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {records.isLoading || appointments.isLoading ? (
            <ListSkeleton rows={4} />
          ) : records.error || appointments.error ? (
            <ErrorState
              message={records.error ?? appointments.error ?? "Unable to load history."}
              onRetry={refetchAll}
            />
          ) : (
            <MedicalHistoryTimeline
              records={records.data ?? []}
              appointments={appointments.data ?? []}
              doctors={doctors.data ?? []}
              hospitals={hospitals.data ?? []}
              patientId={detail.id}
            />
          )}
        </div>

        <div className="space-y-4">
          {hospitalId && (
            <ClinicalSummaryPanel
              doctorId={doctorId}
              patientId={detail.id}
              hospitalId={hospitalId}
              onSaved={refetchAll}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="size-4" aria-hidden="true" />
                Documents and imaging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Laboratory reports, imaging and uploaded documents are not part of the
                shared medical record model yet, so none are shown. Nothing is implied
                about results that are not stored.
              </p>
              <p className="text-muted-foreground">
                Clinical images and documents can be reviewed in the AI Clinical Assistant,
                where their limitations are stated explicitly.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/doctor/assistant?patientId=${detail.id}`}>Open assistant</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
