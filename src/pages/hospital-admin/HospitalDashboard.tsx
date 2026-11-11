import { Link } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Plus,
  Settings,
  Stethoscope,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HospitalActivityFeed } from "@/components/hospital/HospitalActivityFeed";
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
import { formatDate, getInitials, todayISO } from "@/utils/format";
import {
  appointmentMetrics,
  buildHospitalActivity,
  countBy,
  isDoctorActive,
} from "./selectors";

export function HospitalDashboard() {
  const { user, hospitalId = "" } = useAuth();

  const hospital = useServiceQuery(
    () => services.hospitals.getById(hospitalId),
    `hospital:${hospitalId}`,
  );
  const doctors = useServiceQuery(
    () => services.doctors.list({ hospitalId }),
    `doctors:${hospitalId}`,
  );
  const departments = useServiceQuery(
    () => services.departments.list({ hospitalId }),
    `departments:${hospitalId}`,
  );
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ hospitalId }),
    `appointments:${hospitalId}`,
  );

  const isLoading =
    hospital.isLoading ||
    doctors.isLoading ||
    departments.isLoading ||
    appointments.isLoading;
  const error =
    hospital.error ?? doctors.error ?? departments.error ?? appointments.error;

  if (!hospitalId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital dashboard" description="Your hospital workspace." />
        <ErrorState
          title="No hospital assigned"
          message="This administrator account is not linked to a hospital yet. The platform team must assign one before you can manage hospital data."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Hospital dashboard"
          description="Loading your hospital overview…"
        />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (error || !hospital.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hospital dashboard" description="Your hospital workspace." />
        <ErrorState
          message={error ?? "We could not load your hospital record."}
          onRetry={() => {
            hospital.refetch();
            doctors.refetch();
            departments.refetch();
            appointments.refetch();
          }}
        />
      </div>
    );
  }

  const record = hospital.data;
  const rows = appointments.data ?? [];
  const doctorRows = doctors.data ?? [];
  const departmentRows = departments.data ?? [];
  const metrics = appointmentMetrics(rows);
  const today = todayISO();

  const todayRows = rows
    .filter((row) => row.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const activeDoctors = doctorRows.filter(isDoctorActive).length;
  const doctorsToday = new Set(
    todayRows.filter((row) => row.status !== "CANCELLED").map((row) => row.doctorId),
  ).size;
  const patientsServed = new Set(rows.map((row) => row.patientId)).size;
  const departmentDoctorCounts = countBy(
    doctorRows,
    (doctor) => doctor.departmentId ?? "UNASSIGNED",
  );
  const recentlyAdded = [...doctorRows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const activity = buildHospitalActivity({
    appointments: rows,
    doctors: doctorRows,
    departments: departmentRows,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullName.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.name}
        description={`${greeting}, ${firstName}. Here is your hospital overview for ${formatDate(today)}.`}
        actions={
          <Button asChild>
            <Link to="/hospital-admin/doctors/new">
              <UserPlus className="size-4" />
              Add doctor
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="bg-secondary text-secondary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
              {getInitials(record.name)}
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{record.name}</p>
                <StatusBadge kind="hospital" value={record.approvalStatus} />
              </div>
              <p className="text-muted-foreground text-sm">
                {record.city} · {record.address}
              </p>
              <p className="text-muted-foreground text-xs">
                {record.phone} · {record.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/hospital-admin/profile">
                <Building2 className="size-4" />
                Hospital profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/hospital-admin/settings">
                <Settings className="size-4" />
                Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered doctors"
          value={doctorRows.length}
          icon={Stethoscope}
          hint={`${activeDoctors} active`}
        />
        <StatCard
          label="Departments"
          value={departmentRows.length}
          icon={Building2}
          tone="sky"
          hint={`${departmentRows.filter((item) => item.status === "ACTIVE").length} active`}
        />
        <StatCard
          label="Today's appointments"
          value={metrics.today}
          icon={CalendarDays}
          tone="violet"
          hint={`${doctorsToday} doctors consulting`}
        />
        <StatCard
          label="Upcoming appointments"
          value={metrics.upcoming}
          icon={CalendarClock}
          tone="amber"
        />
        <StatCard label="Completed" value={metrics.completed} icon={CalendarCheck} />
        <StatCard label="Cancelled" value={metrics.cancelled} icon={CalendarX} tone="amber" />
        <StatCard
          label="Patients served"
          value={patientsServed}
          icon={UsersRound}
          tone="sky"
          hint="Patients with appointments here"
        />
        <StatCard
          label="Total appointments"
          value={metrics.total}
          icon={BarChart3}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Today&apos;s appointments</h2>
              <p className="text-muted-foreground text-sm">
                {todayRows.length} scheduled · {formatDate(today)}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/hospital-admin/appointments">View all</Link>
            </Button>
          </div>

          <AppointmentTable
            appointments={todayRows}
            perspective="hospital-admin"
            emptyTitle="No appointments today"
            emptyDescription="Bookings made by patients appear here automatically."
            actions={(appointment) => (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/hospital-admin/appointments/${appointment.id}`}>View</Link>
              </Button>
            )}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Common hospital management tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/hospital-admin/doctors/new">
                <UserPlus className="size-4" />
                Register a doctor
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/hospital-admin/departments/new">
                <Plus className="size-4" />
                Create a department
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/hospital-admin/appointments">
                <CalendarDays className="size-4" />
                View appointments
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/hospital-admin/calendar">
                <CalendarCheck className="size-4" />
                Open calendar
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/hospital-admin/analytics">
                <BarChart3 className="size-4" />
                View analytics
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/hospital-admin/profile">
                <Building2 className="size-4" />
                Manage hospital profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctors</CardTitle>
            <CardDescription>Roster health at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total doctors</span>
              <span className="font-medium tabular-nums">{doctorRows.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium tabular-nums">{activeDoctors}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">With appointments today</span>
              <span className="font-medium tabular-nums">{doctorsToday}</span>
            </div>
            <div className="border-t pt-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Recently added
              </p>
              {recentlyAdded.length === 0 ? (
                <p className="text-muted-foreground text-sm">No doctors registered yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentlyAdded.map((doctor) => (
                    <li key={doctor.id}>
                      <Link
                        to={`/hospital-admin/doctors/${doctor.id}`}
                        className="hover:text-primary text-sm font-medium"
                      >
                        {doctor.fullName}
                      </Link>
                      <p className="text-muted-foreground text-xs">{doctor.specialty}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/hospital-admin/doctors">Manage doctors</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Departments</CardTitle>
            <CardDescription>Doctors per department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {departmentRows.length === 0 ? (
              <p className="text-muted-foreground">
                No departments yet. Create one to organise your clinics.
              </p>
            ) : (
              <ul className="space-y-2">
                {departmentRows.slice(0, 5).map((department) => (
                  <li key={department.id} className="flex items-start justify-between gap-2">
                    <Link
                      to={`/hospital-admin/departments/${department.id}`}
                      className="hover:text-primary min-w-0"
                    >
                      <span className="block truncate font-medium">{department.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {department.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </Link>
                    <span className="text-muted-foreground tabular-nums">
                      {departmentDoctorCounts[department.id] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
              <Link to="/hospital-admin/departments">Manage departments</Link>
            </Button>
          </CardContent>
        </Card>

        <HospitalActivityFeed items={activity} />
      </div>
    </div>
  );
}
