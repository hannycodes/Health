import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import {
  AppointmentFilters,
  type AppointmentFilterKey,
} from "@/components/doctor/AppointmentFilters";
import { Button } from "@/components/ui/button";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { canCompleteAppointment } from "@/features/doctor/utils";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { AppointmentStatus } from "@/types";
import { formatDate, todayISO } from "@/utils/format";

export function DoctorAppointmentsPage() {
  const { appointments, isLoading, error, refetch } = useDoctorWorkspace();
  const [filter, setFilter] = useState<AppointmentFilterKey>("ALL");
  const [search, setSearch] = useState("");

  const today = todayISO();

  const visible = useMemo(() => {
    const statusFor: Partial<Record<AppointmentFilterKey, AppointmentStatus>> = {
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
    };
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      if (filter === "TODAY" && appointment.date !== today) return false;
      if (
        filter === "UPCOMING" &&
        !(appointment.status === "BOOKED" && appointment.date >= today)
      ) {
        return false;
      }
      const status = statusFor[filter];
      if (status && appointment.status !== status) return false;
      if (term && !appointment.patientName.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [appointments, filter, search, today]);

  async function completeAppointment(id: string) {
    try {
      // Payment status is intentionally untouched by this action.
      await services.appointments.complete(id);
      toast.success("Consultation marked as completed.");
      refetch();
    } catch (completeError) {
      toast.error(getApiErrorMessage(completeError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Every appointment booked with you. Completing a visit never changes its payment status."
        breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Appointments" }]}
      />

      <AppointmentFilters
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
      />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {visible.length} appointment{visible.length === 1 ? "" : "s"} shown
          </p>
          <AppointmentTable
            appointments={visible}
            perspective="doctor"
            emptyTitle="No appointments match this filter"
            emptyDescription="Adjust the filters or search term to see other appointments."
            actions={(appointment) => (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/doctor/appointments/${appointment.id}`}>Open</Link>
                </Button>
                {canCompleteAppointment(appointment) ? (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="success">
                        Complete
                      </Button>
                    }
                    title="Mark this consultation as completed?"
                    description={`${appointment.patientName} · ${formatDate(appointment.date)} at ${appointment.startTime}. The payment status is not changed.`}
                    confirmLabel="Mark completed"
                    onConfirm={() => completeAppointment(appointment.id)}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    title="Only today's or past bookings can be completed"
                  >
                    Complete
                  </Button>
                )}
              </>
            )}
          />
        </>
      )}
    </div>
  );
}
