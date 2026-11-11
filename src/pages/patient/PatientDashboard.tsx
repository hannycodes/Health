import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarPlus,
  FileHeart,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { HealthSummaryCard } from "@/components/patient/HealthSummaryCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import {
  formatDate,
  formatDateTime,
  formatTimeRange,
  greetingFor,
  todayISO,
} from "@/utils/format";

const QUICK_ACTIONS = [
  {
    label: "Find a hospital",
    to: "/patient/hospitals",
    icon: Building2,
    description: "Approved hospitals near you",
  },
  {
    label: "Find a doctor",
    to: "/patient/doctors",
    icon: Stethoscope,
    description: "Browse by specialty",
  },
  {
    label: "Book appointment",
    to: "/patient/doctors",
    icon: CalendarPlus,
    description: "Choose a doctor and time",
  },
  {
    label: "Medical history",
    to: "/patient/medical-history",
    icon: FileHeart,
    description: "Visits, results and prescriptions",
  },
];

export function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";
  const firstName = user?.fullName.split(" ")[0] ?? "there";

  const patientQuery = useServiceQuery(
    () => services.patients.getByUserId(patientId),
    patientId,
  );
  const appointmentsQuery = useServiceQuery(
    () => services.appointments.listDetailed({ patientId }),
    patientId,
  );
  const notificationsQuery = useServiceQuery(
    () => services.notifications.listForUser(patientId),
    patientId,
  );
  const doctorsQuery = useServiceQuery(
    () => services.doctors.list({ acceptingOnly: true }),
    "recommended-doctors",
  );
  const hospitalsQuery = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const today = todayISO();
  const appointments = appointmentsQuery.data ?? [];
  const upcoming = appointments
    .filter((row) => row.status === "BOOKED" && row.date >= today)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const nextAppointment = upcoming[0];
  const notifications = notificationsQuery.data ?? [];

  const hospitalName = (hospitalId: string) =>
    hospitalsQuery.data?.find((hospital) => hospital.id === hospitalId)?.name;
  const recommendedDoctors = (doctorsQuery.data ?? []).slice(0, 3);

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingFor()}, ${firstName}`}
        description={`${dateLabel} · How are you feeling today? Your care, appointments and AI guidance are all in one place.`}
        actions={
          <Button asChild>
            <Link to="/patient/assistant">
              <Sparkles className="size-4" aria-hidden="true" />
              Talk to the AI Assistant
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        <Link
          to="/patient/assistant"
          className="from-primary to-emerald-700 hover:to-emerald-800 group relative overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-sm transition-colors"
        >
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
              <Sparkles className="size-3" aria-hidden="true" />
              AI Health Assistant
            </span>
            <p className="text-lg font-semibold">Not feeling well? Describe your symptoms.</p>
            <p className="max-w-lg text-sm text-white/85">
              Get general guidance, suggested next steps and a recommendation for the
              right kind of specialist. You can attach a symptom photo.
            </p>
            <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium">
              Start a conversation
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
          <span
            className="absolute -right-6 -bottom-8 size-40 rounded-full bg-white/10"
            aria-hidden="true"
          />
        </Link>

      </div>

      <HealthSummaryCard patient={patientQuery.data} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming appointment</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patient/appointments">All appointments</Link>
            </Button>
          </div>

          {appointmentsQuery.isLoading ? (
            <ListSkeleton rows={1} />
          ) : appointmentsQuery.error ? (
            <ErrorState
              message={appointmentsQuery.error}
              onRetry={() => appointmentsQuery.refetch()}
            />
          ) : nextAppointment ? (
            <Card>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{nextAppointment.doctorName}</p>
                    <p className="text-muted-foreground text-xs">
                      {nextAppointment.doctorSpecialty} · {nextAppointment.hospitalName}
                    </p>
                  </div>
                  <StatusBadge kind="appointment" value={nextAppointment.status} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="text-primary size-4" aria-hidden="true" />
                    {formatDate(nextAppointment.date)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTimeRange(nextAppointment.startTime, nextAppointment.endTime)}
                  </span>
                </div>
                {upcoming.length > 1 && (
                  <p className="text-muted-foreground text-xs">
                    {upcoming.length - 1} more upcoming appointment
                    {upcoming.length - 1 === 1 ? "" : "s"}.
                  </p>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/patient/appointments/${nextAppointment.id}`}>
                    View details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="space-y-2 py-6 text-center">
                <p className="text-sm font-medium">No upcoming appointments</p>
                <p className="text-muted-foreground text-sm">
                  Book a consultation with a doctor to get started.
                </p>
                <Button size="sm" asChild>
                  <Link to="/patient/doctors">Find a doctor</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <Card className="gap-2 py-4">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto justify-start py-2"
                asChild
              >
                <Link to={action.to}>
                  <action.icon className="size-4" aria-hidden="true" />
                  <span className="text-left">
                    <span className="block text-sm">{action.label}</span>
                    <span className="text-muted-foreground block text-[11px] font-normal">
                      {action.description}
                    </span>
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recommended doctors</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/patient/doctors">See all doctors</Link>
          </Button>
        </div>
        {doctorsQuery.isLoading ? (
          <ListSkeleton rows={2} />
        ) : recommendedDoctors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No doctors are accepting patients right now.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendedDoctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                hospitalName={hospitalName(doctor.hospitalId)}
                action={
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    asChild
                  >
                    <Link to={`/patient/doctors/${doctor.id}`}>View profile</Link>
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Recent activity</h2>
        {notificationsQuery.isLoading ? (
          <ListSkeleton rows={2} />
        ) : notifications.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing new yet.</p>
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {notifications.slice(0, 4).map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={notification.link ?? "/patient/notifications"}
                    className="hover:bg-accent/60 flex items-start gap-3 px-4 py-3 transition-colors"
                  >
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        notification.isRead ? "bg-border" : "bg-primary"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {notification.message}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
