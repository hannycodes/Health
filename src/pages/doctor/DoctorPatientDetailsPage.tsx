import { Link, useParams } from "react-router-dom";
import { ClipboardPlus, FileHeart, Sparkles } from "lucide-react";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { ClinicalSummaryPanel } from "@/components/doctor/ClinicalSummaryPanel";
import { MedicalRecordCard } from "@/components/doctor/MedicalRecordCard";
import { PatientInfoPanel } from "@/components/doctor/PatientInfoPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorizedPatient } from "@/features/doctor/services/doctorAccess";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function DoctorPatientDetailsPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const doctorId = user?.id ?? "";

  const patient = useServiceQuery(
    () => getAuthorizedPatient(doctorId, id),
    `${doctorId}:${id}`,
  );
  const appointments = useServiceQuery(
    () =>
      services.appointments
        .listDetailed({ doctorId, patientId: id })
        .then((rows) => rows.sort((a, b) => b.date.localeCompare(a.date))),
    `${doctorId}:${id}`,
  );
  const records = useServiceQuery(
    () => services.medicalRecords.listByPatient(id),
    `${doctorId}:${id}`,
  );
  const doctors = useServiceQuery(() => services.doctors.list(), "doctors");
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const refetchAll = () => {
    patient.refetch();
    appointments.refetch();
    records.refetch();
  };

  if (patient.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient overview" description="Loading patient record…" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (patient.error || !patient.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Patient access"
          breadcrumbs={[
            { label: "Doctor", to: "/doctor" },
            { label: "Patients", to: "/doctor/patients" },
            { label: "Restricted" },
          ]}
        />
        {patient.error ? (
          <ErrorState
            title="Unable to open this patient"
            message={patient.error}
            onRetry={patient.refetch}
          />
        ) : (
          <EmptyState
            icon={FileHeart}
            title="Patient not available"
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
  const upcoming = (appointments.data ?? []).filter((row) => row.status === "BOOKED");
  const previous = (appointments.data ?? []).filter((row) => row.status !== "BOOKED");
  const hospitalId = doctors.data?.find((item) => item.id === doctorId)?.hospitalId ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.fullName}
        description={`Patient overview · ${detail.id}`}
        breadcrumbs={[
          { label: "Doctor", to: "/doctor" },
          { label: "Patients", to: "/doctor/patients" },
          { label: detail.fullName },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/doctor/patients/${detail.id}/history`}>
                <FileHeart className="size-4" />
                Medical history
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/doctor/assistant?patientId=${detail.id}`}>
                <Sparkles className="size-4" />
                AI assistant
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/doctor/patients/${detail.id}/records/new`}>
                <ClipboardPlus className="size-4" />
                New record
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <PatientInfoPanel patient={detail} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {upcoming.map((row) => (
                    <li key={row.id}>
                      <Link to={`/doctor/appointments/${row.id}`} className="hover:underline">
                        {row.date} · {row.startTime} · {row.reason}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Previous appointments</h2>
            <AppointmentTable
              appointments={previous}
              perspective="doctor"
              emptyTitle="No previous appointments"
              emptyDescription="Completed and cancelled visits appear here."
            />
          </section>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent clinical records</CardTitle>
            </CardHeader>
            <CardContent>
              <MedicalRecordCard
                records={records.data ?? []}
                doctors={doctors.data ?? []}
                hospitals={hospitals.data ?? []}
                patientId={detail.id}
              />
            </CardContent>
          </Card>

          {hospitalId && (
            <ClinicalSummaryPanel
              doctorId={doctorId}
              patientId={detail.id}
              hospitalId={hospitalId}
              onSaved={refetchAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}
