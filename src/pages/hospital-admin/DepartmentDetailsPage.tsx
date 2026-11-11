import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, Pencil, Power } from "lucide-react";
import { toast } from "sonner";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DepartmentForm } from "@/components/hospital/DepartmentForm";
import { DoctorTable } from "@/components/hospital/DoctorTable";
import { Badge } from "@/components/ui/badge";
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
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { DepartmentStatus } from "@/types";
import { formatDate } from "@/utils/format";
import { appointmentMetrics, countBy } from "./selectors";

export function DepartmentDetailsPage() {
  const { id = "" } = useParams();
  const { hospitalId = "" } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const detail = useServiceQuery(async () => {
    if (!id) return null;
    const [department, doctors, appointments] = await Promise.all([
      services.departments.getById(id),
      services.doctors.list({ hospitalId }),
      services.appointments.listDetailed({ hospitalId }),
    ]);
    const assignedDoctors = doctors.filter((doctor) => doctor.departmentId === id);
    const doctorIds = new Set(assignedDoctors.map((doctor) => doctor.id));
    return {
      department,
      doctors: assignedDoctors,
      appointments: appointments.filter((row) => doctorIds.has(row.doctorId)),
    };
  }, `department:${id}:${hospitalId}`);

  const department = detail.data?.department;

  async function setStatus(next: DepartmentStatus) {
    if (!department) return;
    try {
      await services.departments.setStatus(department.id, next);
      toast.success(
        next === "ACTIVE" ? "Department reactivated." : "Department deactivated.",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (!hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Department" />
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
        <PageHeader title="Department" description="Loading department details…" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Department" />
        <ErrorState message={detail.error} onRetry={detail.refetch} />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Department not found"
          breadcrumbs={[
            { label: "Hospital admin", to: "/hospital-admin" },
            { label: "Departments", to: "/hospital-admin/departments" },
            { label: "Not found" },
          ]}
        />
        <ErrorState
          title="We could not find this department"
          message="It may have been removed, or the link is out of date."
        />
      </div>
    );
  }

  if (department.hospitalId !== hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Access restricted" />
        <ErrorState
          title="This department belongs to another hospital"
          message="Hospital administrators can only view departments of their own hospital."
        />
      </div>
    );
  }

  const doctors = detail.data?.doctors ?? [];
  const appointments = detail.data?.appointments ?? [];
  const metrics = appointmentMetrics(appointments);
  const appointmentCounts = countBy(appointments, (row) => row.doctorId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={department.name}
        description={`${department.specialty} · Added ${formatDate(
          department.createdAt.slice(0, 10),
        )}`}
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Departments", to: "/hospital-admin/departments" },
          { label: department.name },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsEditing((value) => !value)}>
              <Pencil className="size-4" />
              {isEditing ? "Close editor" : "Edit"}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <Power className="size-4" />
                  {department.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                </Button>
              }
              title={
                department.status === "ACTIVE"
                  ? "Deactivate this department?"
                  : "Reactivate this department?"
              }
              description={
                department.status === "ACTIVE"
                  ? `${department.name} will be hidden from new doctor assignments. ${doctors.length} doctor(s) stay linked and no existing appointment is cancelled.`
                  : `${department.name} will be available again for doctor assignment.`
              }
              confirmLabel={
                department.status === "ACTIVE" ? "Deactivate" : "Reactivate"
              }
              destructive={department.status === "ACTIVE"}
              onConfirm={() =>
                setStatus(department.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")
              }
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned doctors" value={doctors.length} icon={Building2} />
        <StatCard label="Appointments" value={metrics.total} icon={Building2} tone="sky" />
        <StatCard label="Completed visits" value={metrics.completed} icon={Building2} tone="violet" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Department information
            <Badge variant={department.status === "ACTIVE" ? "secondary" : "outline"}>
              {department.status === "ACTIVE" ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
          <CardDescription>{department.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Specialty</p>
            <p className="font-medium">{department.specialty}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Phone</p>
            <p className="font-medium">{department.contactPhone ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-medium">{department.contactEmail ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Location</p>
            <p className="font-medium">{department.location ?? "Not set"}</p>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit department</CardTitle>
            <CardDescription>Update the department details shown to staff.</CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentForm
              hospitalId={hospitalId}
              department={department}
              onSaved={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Assigned doctors</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/hospital-admin/doctors">Manage roster</Link>
          </Button>
        </div>
        <DoctorTable
          doctors={doctors}
          departments={[department]}
          appointmentCounts={appointmentCounts}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Department appointments</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/hospital-admin/appointments">All appointments</Link>
          </Button>
        </div>
        <AppointmentTable
          appointments={appointments}
          perspective="hospital-admin"
          emptyTitle="No appointments yet"
          emptyDescription="Appointments booked with this department's doctors appear here."
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
