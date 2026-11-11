import { useState } from "react";
import { toast } from "sonner";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatDate } from "@/utils/format";

type StatusFilter = "ALL" | "BOOKED" | "COMPLETED" | "CANCELLED";

export function PatientAppointments() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () =>
      services.appointments.listDetailed({
        patientId,
        status: status === "ALL" ? undefined : status,
      }),
    `${patientId}:${status}`,
  );

  async function cancelAppointment(id: string) {
    try {
      await services.appointments.cancel(id);
      toast.success("Appointment cancelled.");
    } catch (cancelError) {
      toast.error(getApiErrorMessage(cancelError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Everything you have booked, including cancelled and completed visits."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Appointments" }]}
        actions={<BookAppointmentDialog patientId={patientId} onBooked={refetch} />}
      />

      <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
        <SelectTrigger className="sm:w-52" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All appointments</SelectItem>
          <SelectItem value="BOOKED">Booked</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <AppointmentTable
          appointments={data ?? []}
          perspective="patient"
          actions={(appointment) =>
            appointment.status === "BOOKED" ? (
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
            ) : null
          }
        />
      )}
    </div>
  );
}
