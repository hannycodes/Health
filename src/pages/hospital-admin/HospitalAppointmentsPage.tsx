import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { filterAppointments, type AppointmentScope } from "./selectors";

export function HospitalAppointmentsPage() {
  const { hospitalId = "" } = useAuth();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<AppointmentScope>("ALL");
  const [doctorId, setDoctorId] = useState("ALL");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [date, setDate] = useState("");

  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ hospitalId }),
    `appointments:${hospitalId}`,
  );
  const doctors = useServiceQuery(
    () => services.doctors.list({ hospitalId }),
    `doctors:${hospitalId}`,
  );
  const departments = useServiceQuery(
    () => services.departments.list({ hospitalId }),
    `departments:${hospitalId}`,
  );

  const rows = filterAppointments(appointments.data ?? [], doctors.data ?? [], {
    search,
    scope,
    doctorId,
    departmentId,
    date: date || undefined,
  });

  async function cancelAppointment(id: string) {
    try {
      await services.appointments.cancel(id);
      toast.success("Appointment cancelled. The patient and doctor were notified.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Every appointment booked at your hospital. Statuses are shared with the patient and doctor portals."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Appointments" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/hospital-admin/calendar">Open calendar</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search patient, doctor or reason"
          ariaLabel="Search appointments"
        />
        <Select value={scope} onValueChange={(value) => setScope(value as AppointmentScope)}>
          <SelectTrigger className="lg:w-44" aria-label="Filter by period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All appointments</SelectItem>
            <SelectItem value="TODAY">Today</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorId} onValueChange={setDoctorId}>
          <SelectTrigger className="lg:w-52" aria-label="Filter by doctor">
            <SelectValue placeholder="All doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All doctors</SelectItem>
            {(doctors.data ?? []).map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="lg:w-52" aria-label="Filter by department">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {(departments.data ?? []).map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={date}
          aria-label="Filter by appointment date"
          onChange={(event) => setDate(event.target.value)}
          className="lg:w-44"
        />
      </div>

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : appointments.isLoading ? (
        <ListSkeleton rows={3} />
      ) : appointments.error ? (
        <ErrorState message={appointments.error} onRetry={appointments.refetch} />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {rows.length} appointment{rows.length === 1 ? "" : "s"} match your filters.
          </p>
          <AppointmentTable
            appointments={rows}
            perspective="hospital-admin"
            actions={(appointment) => (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/hospital-admin/appointments/${appointment.id}`}>View</Link>
                </Button>
                {appointment.status === "BOOKED" && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm">
                        Cancel
                      </Button>
                    }
                    title="Cancel this appointment?"
                    description={`The appointment on ${formatDate(
                      appointment.date,
                    )} at ${appointment.startTime} with ${
                      appointment.doctorName
                    } will be cancelled and both the patient and doctor notified. Payment status is unchanged.`}
                    confirmLabel="Cancel appointment"
                    destructive
                    onConfirm={() => cancelAppointment(appointment.id)}
                  />
                )}
              </>
            )}
          />
        </>
      )}
    </div>
  );
}
