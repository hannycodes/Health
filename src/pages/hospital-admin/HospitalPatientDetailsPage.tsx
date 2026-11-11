import { Link, useParams } from "react-router-dom";
import { CalendarDays, ShieldAlert } from "lucide-react";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate } from "@/utils/format";

export function HospitalPatientDetailsPage() {
  const { id = "" } = useParams();
  const { hospitalId = "" } = useAuth();

  const detail = useServiceQuery(async () => {
    if (!id) return null;
    const [patients, appointments, records] = await Promise.all([
      services.patients.list(),
      services.appointments.listDetailed({ hospitalId }),
      services.medicalRecords.listByPatient(id),
    ]);
    return {
      patient: patients.find((item) => item.id === id) ?? null,
      appointments: appointments.filter((row) => row.patientId === id),
      // Only whether clinical documentation exists at THIS hospital — never the
      // diagnosis, treatment or notes themselves.
      recordCount: records.filter((record) => record.hospitalId === hospitalId).length,
    };
  }, `patient:${id}:${hospitalId}`);

  const patient = detail.data?.patient;
  const appointments = detail.data?.appointments ?? [];

  if (!hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient" />
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient" description="Loading patient record…" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient" />
        <ErrorState message={detail.error} onRetry={detail.refetch} />
      </div>
    );
  }

  if (!patient || appointments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Patient not available"
          breadcrumbs={[
            { label: "Hospital admin", to: "/hospital-admin" },
            { label: "Patients", to: "/hospital-admin/patients" },
            { label: "Not available" },
          ]}
        />
        <ErrorState
          title="This patient is not linked to your hospital"
          message="Hospital administrators can only view patients who have appointments at their own hospital."
        />
      </div>
    );
  }

  const upcoming = appointments
    .filter((row) => row.status === "BOOKED")
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const doctors = Array.from(new Set(appointments.map((row) => row.doctorName)));

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.fullName}
        description={`Patient ${patient.id} · ${appointments.length} appointment${
          appointments.length === 1 ? "" : "s"
        } at your hospital`}
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Patients", to: "/hospital-admin/patients" },
          { label: patient.fullName },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Patient information</CardTitle>
            <CardDescription>
              Administrative details shared for hospital coordination.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Full name</p>
              <p className="font-medium">{patient.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Patient ID</p>
              <p className="font-medium">{patient.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p className="font-medium">{patient.phone ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Date of birth</p>
              <p className="font-medium">
                {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Gender</p>
              <p className="font-medium">{patient.gender ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Blood type</p>
              <p className="font-medium">{patient.bloodType ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Address</p>
              <p className="font-medium">{patient.address ?? "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hospital coordination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Upcoming visit</p>
                <p className="font-medium">
                  {upcoming
                    ? `${formatDate(upcoming.date)} at ${upcoming.startTime} · ${upcoming.doctorName}`
                    : "None scheduled"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Doctors involved</p>
                <p className="font-medium">{doctors.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Clinical records held here</p>
                <p className="font-medium">
                  {detail.data?.recordCount ?? 0} record
                  {(detail.data?.recordCount ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="size-4" aria-hidden="true" />
                Clinical records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Diagnoses, prescriptions and clinical notes are only available to the
                treating doctor and are not displayed to hospital administration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Appointment history</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/hospital-admin/appointments">
              <CalendarDays className="size-4" />
              All appointments
            </Link>
          </Button>
        </div>
        <AppointmentTable
          appointments={appointments}
          perspective="hospital-admin"
          emptyTitle="No appointments at this hospital"
          emptyDescription="This patient has no visits recorded here."
          actions={(appointment) => (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/hospital-admin/appointments/${appointment.id}`}>View</Link>
            </Button>
          )}
        />
      </section>
    </div>
  );
}
