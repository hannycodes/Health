import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Pencil,
  Power,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DoctorForm } from "@/components/hospital/DoctorForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WEEKDAY_LABELS } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatCurrency, formatDate, getInitials, todayISO } from "@/utils/format";
import { appointmentMetrics, departmentNameOf, isDoctorActive } from "./selectors";

export function DoctorDetailsPage() {
  const { id = "" } = useParams();
  const { hospitalId = "" } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const detail = useServiceQuery(async () => {
    if (!id) return null;
    const [doctor, departments, allAppointments, availability] = await Promise.all([
      services.doctors.getById(id),
      services.departments.list({ hospitalId }),
      services.appointments.listDetailed({ hospitalId }),
      services.doctors.listAvailability(id),
    ]);
    return {
      doctor,
      departments,
      appointments: allAppointments.filter((row) => row.doctorId === id),
      availability,
    };
  }, `doctor:${id}:${hospitalId}`);

  const doctor = detail.data?.doctor;

  async function setActive(active: boolean) {
    if (!doctor) return;
    try {
      await services.doctors.setActive(doctor.id, active);
      toast.success(active ? "Doctor reactivated." : "Doctor deactivated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (!hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor" />
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
        <PageHeader title="Doctor" description="Loading doctor profile…" />
        <ListSkeleton rows={2} />
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor" />
        <ErrorState message={detail.error} onRetry={detail.refetch} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Doctor not found"
          breadcrumbs={[
            { label: "Hospital admin", to: "/hospital-admin" },
            { label: "Doctors", to: "/hospital-admin/doctors" },
            { label: "Not found" },
          ]}
        />
        <ErrorState
          title="We could not find this doctor"
          message="The profile may have been removed, or the link is out of date."
        />
      </div>
    );
  }

  if (doctor.hospitalId !== hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Access restricted" />
        <ErrorState
          title="This doctor belongs to another hospital"
          message="Hospital administrators can only manage doctors registered at their own hospital."
        />
      </div>
    );
  }

  const appointments = detail.data?.appointments ?? [];
  const departments = detail.data?.departments ?? [];
  const availability = detail.data?.availability ?? [];
  const metrics = appointmentMetrics(appointments);
  const today = todayISO();
  const upcomingCount = appointments.filter(
    (row) => row.status === "BOOKED" && row.date >= today,
  ).length;
  const patientsSeen = new Set(appointments.map((row) => row.patientId)).size;
  const active = isDoctorActive(doctor);

  return (
    <div className="space-y-6">
      <PageHeader
        title={doctor.fullName}
        description={`${doctor.specialty} · ${departmentNameOf(departments, doctor.departmentId)}`}
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Doctors", to: "/hospital-admin/doctors" },
          { label: doctor.fullName },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsEditing((value) => !value)}>
              <Pencil className="size-4" />
              {isEditing ? "Close editor" : "Edit"}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant={active ? "outline" : "default"}>
                  <Power className="size-4" />
                  {active ? "Deactivate" : "Reactivate"}
                </Button>
              }
              title={active ? "Deactivate this doctor?" : "Reactivate this doctor?"}
              description={
                active
                  ? `${doctor.fullName} will no longer accept new patients.${
                      upcomingCount > 0
                        ? ` ${upcomingCount} upcoming appointment(s) exist — they are NOT cancelled and must be handled individually.`
                        : " There are no upcoming appointments to reassign."
                    }`
                  : `${doctor.fullName} will be able to accept patients again.`
              }
              confirmLabel={active ? "Deactivate doctor" : "Reactivate doctor"}
              destructive={active}
              onConfirm={() => setActive(!active)}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments" value={metrics.total} icon={CalendarDays} />
        <StatCard label="Upcoming" value={upcomingCount} icon={CalendarClock} tone="amber" />
        <StatCard label="Completed" value={metrics.completed} icon={CalendarCheck} tone="sky" />
        <StatCard label="Patients seen" value={patientsSeen} icon={UsersRound} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Contact and assignment information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-full text-sm font-semibold">
                {getInitials(doctor.fullName)}
              </span>
              <div className="space-y-1">
                <p className="font-semibold">{doctor.fullName}</p>
                <p className="text-muted-foreground text-sm">{doctor.email}</p>
                <p className="text-muted-foreground text-sm">{doctor.phone ?? "No phone"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={active ? "secondary" : "outline"}>
                {active ? "Active" : "Deactivated"}
              </Badge>
              <Badge variant="outline">
                {doctor.accountStatus === "PENDING_INVITATION"
                  ? "Invitation pending"
                  : "Account active"}
              </Badge>
              <Badge variant="outline">
                {doctor.isAcceptingPatients ? "Accepting patients" : "Not accepting patients"}
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Specialty</dt>
                <dd className="font-medium">{doctor.specialty}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Department</dt>
                <dd className="font-medium">
                  {departmentNameOf(departments, doctor.departmentId)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Licence</dt>
                <dd className="font-medium">{doctor.licenseNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Experience</dt>
                <dd className="font-medium">{doctor.yearsExperience} years</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Consultation fee</dt>
                <dd className="font-medium">
                  {formatCurrency(doctor.consultationFee)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Joined</dt>
                <dd className="font-medium">{formatDate(doctor.createdAt.slice(0, 10))}</dd>
              </div>
            </dl>

            <div>
              <p className="text-muted-foreground text-xs">Professional biography</p>
              <p className="mt-1 text-sm">{doctor.bio}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly availability</CardTitle>
            <CardDescription>
              Published by the doctor. Hospital admins can review but not edit clinic hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availability.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                This doctor has not published availability yet.
              </p>
            ) : (
              <ul className="divide-border divide-y text-sm">
                {availability.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between py-2 first:pt-0">
                    <span className="font-medium">{WEEKDAY_LABELS[slot.dayOfWeek]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {slot.startTime} – {slot.endTime} · {slot.slotDurationMinutes} min slots
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit doctor</CardTitle>
            <CardDescription>
              Contact, department and clinical profile. The licence number is locked because
              credentials are verified by the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DoctorForm
              hospitalId={hospitalId}
              departments={departments}
              doctor={doctor}
              onSaved={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent appointments</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/hospital-admin/appointments">All appointments</Link>
          </Button>
        </div>
        <AppointmentTable
          appointments={appointments}
          perspective="hospital-admin"
          emptyTitle="No appointments with this doctor"
          emptyDescription="Bookings made by patients appear here automatically."
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
