import { useState } from "react";
import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { AppointmentCalendar } from "@/components/hospital/AppointmentCalendar";
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
import { services } from "@/services";
import type { AppointmentStatus } from "@/types";
import { filterAppointments } from "./selectors";

export function HospitalCalendarPage() {
  const { hospitalId = "" } = useAuth();
  const [doctorId, setDoctorId] = useState("ALL");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [status, setStatus] = useState<AppointmentStatus | "ALL">("ALL");

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
    doctorId,
    departmentId,
    status,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment calendar"
        description="Day, week and month views of your hospital's shared appointment schedule."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Calendar" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/hospital-admin/appointments">Appointment list</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select value={doctorId} onValueChange={setDoctorId}>
          <SelectTrigger className="lg:w-56" aria-label="Filter by doctor">
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
          <SelectTrigger className="lg:w-56" aria-label="Filter by department">
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
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as AppointmentStatus | "ALL")}
        >
          <SelectTrigger className="lg:w-48" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="BOOKED">Booked</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          {rows.length} appointment{rows.length === 1 ? "" : "s"} shown
        </p>
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
        <AppointmentCalendar appointments={rows} />
      )}
    </div>
  );
}
