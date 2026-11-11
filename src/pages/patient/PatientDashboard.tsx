import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarClock,
  FileHeart,
  Sparkles,
  Stethoscope,
  Wallet,
} from "lucide-react";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
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
import { todayISO } from "@/utils/format";

export function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";

  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ patientId }),
    patientId,
  );
  const payments = useServiceQuery(
    () => services.payments.listByPatient(patientId),
    patientId,
  );

  const rows = appointments.data ?? [];
  const today = todayISO();
  const upcoming = rows
    .filter((row) => row.status === "BOOKED" && row.date >= today)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const completed = rows.filter((row) => row.status === "COMPLETED").length;
  const outstanding = (payments.data ?? []).filter(
    (payment) => payment.status === "UNPAID_AT_HOSPITAL" || payment.status === "PENDING",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(" ")[0] ?? "there"}`}
        description="Your appointments, care history and AI-guided navigation in one place."
        actions={<BookAppointmentDialog patientId={patientId} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming visits"
          value={upcoming.length}
          icon={CalendarClock}
          hint={upcoming[0] ? `Next on ${upcoming[0].date}` : "Nothing scheduled"}
        />
        <StatCard
          label="Completed visits"
          value={completed}
          icon={CalendarCheck}
          tone="sky"
        />
        <StatCard
          label="Outstanding payments"
          value={outstanding}
          icon={Wallet}
          tone="amber"
          hint="Payment is tracked separately"
        />
        <StatCard
          label="Medical records"
          value={completed}
          icon={FileHeart}
          tone="violet"
          hint="View full history"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming appointments</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patient/appointments">View all</Link>
            </Button>
          </div>

          {appointments.isLoading ? (
            <ListSkeleton rows={2} />
          ) : appointments.error ? (
            <ErrorState
              message={appointments.error}
              onRetry={() => appointments.refetch()}
            />
          ) : (
            <AppointmentTable
              appointments={upcoming.slice(0, 4)}
              perspective="patient"
              emptyTitle="No upcoming appointments"
              emptyDescription="Book a consultation to get started."
            />
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Where do you want to go next?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/patient/ai-navigator">
                <Sparkles className="size-4" />
                Describe symptoms with AI Navigator
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/patient/doctors">
                <Stethoscope className="size-4" />
                Browse doctors by specialty
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/patient/medical-history">
                <FileHeart className="size-4" />
                Review medical history
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
