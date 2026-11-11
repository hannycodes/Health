import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  ClipboardPlus,
  FileText,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DoctorStatGrid } from "@/components/doctor/DoctorStatGrid";
import { TodaySchedule } from "@/components/doctor/TodaySchedule";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { firstName, formatLongDate, greetingForNow } from "@/features/doctor/utils";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { formatDate, todayISO } from "@/utils/format";

export function DoctorDashboardPage() {
  const { doctor, patients, appointments, records, isLoading, error, refetch } =
    useDoctorWorkspace();
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const hospital = hospitals.data?.find((item) => item.id === doctor?.hospitalId);
  const today = todayISO();

  const byDateTime = (a: { date: string; startTime: string }, b: { date: string; startTime: string }) =>
    `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);

  const todaysAppointments = appointments.filter((row) => row.date === today).sort(byDateTime);
  const upcoming = appointments
    .filter((row) => row.status === "BOOKED" && row.date > today)
    .sort(byDateTime);
  const completed = appointments.filter((row) => row.status === "COMPLETED");
  const pendingDocumentation = completed.filter(
    (row) => !records.some((record) => record.appointmentId === row.id),
  );

  const recentPatients = [...patients]
    .sort((a, b) => {
      const last = (patientId: string) =>
        appointments
          .filter((row) => row.patientId === patientId)
          .sort(byDateTime)
          .at(-1)?.date ?? "";
      return last(b.id).localeCompare(last(a.id));
    })
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor dashboard" description="Loading your clinical overview…" />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor dashboard" />
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingForNow()}, ${firstName(doctor?.fullName ?? "Doctor")}`}
        description={
          doctor
            ? `${doctor.specialty}${hospital ? ` · ${hospital.name}` : ""} · ${formatLongDate()}. Here is your clinical overview for today.`
            : "Here is your clinical overview for today."
        }
        breadcrumbs={[{ label: "Doctor" }]}
        actions={
          <Button asChild>
            <Link to="/doctor/assistant">
              <Sparkles className="size-4" />
              Open Clinical Assistant
            </Link>
          </Button>
        }
      />

      <DoctorStatGrid
        todayCount={todaysAppointments.length}
        upcomingCount={upcoming.length}
        completedCount={completed.length}
        patientCount={patients.length}
        pendingDocumentationCount={pendingDocumentation.length}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Today&apos;s schedule</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/doctor/appointments">View all</Link>
              </Button>
            </div>
            <TodaySchedule appointments={todaysAppointments} />
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Upcoming appointments</h2>
            <Card className="py-0">
              <CardContent className="divide-y px-0">
                {upcoming.length === 0 ? (
                  <p className="text-muted-foreground px-5 py-6 text-sm">
                    No upcoming bookings yet.
                  </p>
                ) : (
                  upcoming.slice(0, 4).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{appointment.patientName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {formatDate(appointment.date)} · {appointment.startTime} ·{" "}
                          {appointment.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge kind="appointment" value={appointment.status} />
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/doctor/appointments/${appointment.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Recent patients</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {recentPatients.length === 0 ? (
                <p className="text-muted-foreground text-sm">No patients in your care yet.</p>
              ) : (
                recentPatients.map((patient) => (
                  <Card key={patient.id}>
                    <CardContent className="flex items-center justify-between gap-2 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{patient.fullName}</p>
                        <p className="text-muted-foreground text-xs">{patient.id}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/doctor/patients/${patient.id}`}>Open</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/30 bg-secondary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="text-primary size-4" aria-hidden="true" />
                AI Clinical Assistant
              </CardTitle>
              <CardDescription>
                Review patient information, summarize medical histories, and get assistance
                analyzing clinical materials. Every output requires your review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link to="/doctor/assistant">
                  Open Clinical Assistant
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-muted-foreground text-xs">
                Decision support only — it never diagnoses, prescribes or changes records.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/doctor/appointments">
                  <CalendarDays className="size-4" />
                  View appointments
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/doctor/patients">
                  <UsersRound className="size-4" />
                  View patients
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/doctor/patients">
                  <ClipboardPlus className="size-4" />
                  Create medical record
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/doctor/patients">
                  <Stethoscope className="size-4" />
                  Open patient history
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/doctor/availability">
                  <CalendarRange className="size-4" />
                  Manage availability
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" aria-hidden="true" />
                Documentation
              </CardTitle>
              <CardDescription>
                {pendingDocumentation.length === 0
                  ? "Every completed consultation has a record."
                  : `${pendingDocumentation.length} completed consultation(s) still need a clinical record.`}
              </CardDescription>
            </CardHeader>
            {pendingDocumentation.length > 0 && (
              <CardContent className="space-y-2">
                {pendingDocumentation.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{appointment.patientName}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to={`/doctor/patients/${appointment.patientId}/records/new?appointmentId=${appointment.id}`}
                      >
                        Add record
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
