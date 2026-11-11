import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatDate, todayISO } from "@/utils/format";

type Filter = "UPCOMING" | "PAST" | "CANCELLED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "UPCOMING", label: "Upcoming" },
  { value: "PAST", label: "Past" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ALL", label: "All" },
];

export function PatientAppointments() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";
  const [filter, setFilter] = useState<Filter>("UPCOMING");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.appointments.listDetailed({ patientId }),
    patientId,
  );

  const today = todayISO();
  const rows = useMemo(() => {
    const all = data ?? [];
    switch (filter) {
      case "UPCOMING":
        return all.filter((item) => item.status === "BOOKED" && item.date >= today);
      case "PAST":
        return all.filter(
          (item) =>
            item.status === "COMPLETED" ||
            (item.status === "BOOKED" && item.date < today),
        );
      case "CANCELLED":
        return all.filter((item) => item.status === "CANCELLED");
      default:
        return all;
    }
  }, [data, filter, today]);

  async function cancelAppointment(id: string) {
    try {
      await services.appointments.cancel(id);
      toast.success("Appointment cancelled. The doctor has been notified.");
    } catch (cancelError) {
      toast.error(getApiErrorMessage(cancelError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My appointments"
        description="Everything you have booked, including cancelled and completed visits."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Appointments" }]}
        actions={
          <Button asChild>
            <Link to="/patient/doctors">Book appointment</Link>
          </Button>
        }
      />

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter appointments"
      >
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
        {data && (
          <Badge variant="secondary" className="ml-auto">
            {rows.length} appointment{rows.length === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            filter === "UPCOMING"
              ? "No upcoming appointments"
              : filter === "PAST"
                ? "No past appointments"
                : filter === "CANCELLED"
                  ? "No cancelled appointments"
                  : "No appointments yet"
          }
          description={
            filter === "UPCOMING"
              ? "Book a consultation and it will appear here."
              : "Try another filter to see your other appointments."
          }
          action={
            filter === "UPCOMING" ? (
              <Button size="sm" asChild>
                <Link to="/patient/doctors">Find a doctor</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setFilter("ALL")}>
                Show all
              </Button>
            )
          }
        />
      ) : (
        <AppointmentTable
          appointments={rows}
          perspective="patient"
          actions={(appointment) => (
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/patient/appointments/${appointment.id}`}>View</Link>
              </Button>
              {appointment.status === "BOOKED" && (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                  }
                  title="Cancel this appointment?"
                  description={`Your appointment on ${formatDate(appointment.date)} at ${appointment.startTime} will be cancelled. Payment status is unchanged.`}
                  confirmLabel="Cancel appointment"
                  destructive
                  onConfirm={() => cancelAppointment(appointment.id)}
                />
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
