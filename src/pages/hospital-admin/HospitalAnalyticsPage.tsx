import { useState } from "react";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Stethoscope,
  UsersRound,
} from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { BarChartCard, TrendChartCard } from "@/components/hospital/AnalyticsCharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { daysFromNowISO, todayISO } from "@/utils/format";
import {
  appointmentMetrics,
  appointmentsByDay,
  departmentNameOf,
  seriesBy,
} from "./selectors";

type RangeKey = "7" | "30" | "90" | "CUSTOM";

export function HospitalAnalyticsPage() {
  const { hospitalId = "" } = useAuth();
  const [range, setRange] = useState<RangeKey>("30");
  const [customFrom, setCustomFrom] = useState(daysFromNowISO(-30));
  const [customTo, setCustomTo] = useState(todayISO());

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

  const isCustom = range === "CUSTOM";
  const start = isCustom ? customFrom : daysFromNowISO(-(Number(range) - 1));
  const end = isCustom ? customTo : todayISO();
  const [from, to] = start <= end ? [start, end] : [end, start];

  const filtered = (appointments.data ?? []).filter(
    (row) => row.date >= from && row.date <= end,
  );
  const metrics = appointmentMetrics(filtered);
  const doctorRows = doctors.data ?? [];
  const departmentRows = departments.data ?? [];

  const days = Math.max(
    1,
    Math.round(
      (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) /
        86_400_000,
    ) + 1,
  );

  const doctorById = new Map(doctorRows.map((doctor) => [doctor.id, doctor]));
  const departmentOfRow = (doctorId: string) =>
    departmentNameOf(departmentRows, doctorById.get(doctorId)?.departmentId);

  const completionRate = metrics.total
    ? Math.round((metrics.completed / metrics.total) * 100)
    : 0;
  const cancellationRate = metrics.total
    ? Math.round((metrics.cancelled / metrics.total) * 100)
    : 0;

  const departmentAnalytics = departmentRows.map((department) => ({
    department,
    doctorCount: doctorRows.filter((doctor) => doctor.departmentId === department.id).length,
    appointmentCount: filtered.filter(
      (row) => doctorById.get(row.doctorId)?.departmentId === department.id,
    ).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital analytics"
        description="Appointment activity, department load and doctor throughput for your hospital."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Analytics" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-2">
        {(["7", "30", "90"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={range === value ? "default" : "outline"}
            onClick={() => setRange(value)}
          >
            Last {value} days
          </Button>
        ))}
        <Button
          size="sm"
          variant={isCustom ? "default" : "outline"}
          onClick={() => setRange("CUSTOM")}
        >
          Custom range
        </Button>
        {isCustom && (
          <>
            <Input
              type="date"
              value={customFrom}
              aria-label="Analytics start date"
              onChange={(event) => setCustomFrom(event.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={customTo}
              aria-label="Analytics end date"
              onChange={(event) => setCustomTo(event.target.value)}
              className="w-40"
            />
          </>
        )}
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
            Showing {from} to {to} · {days} days
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Appointments" value={metrics.total} icon={CalendarDays} />
            <StatCard label="Completed" value={metrics.completed} icon={CalendarCheck} tone="sky" />
            <StatCard label="Upcoming" value={metrics.upcoming} icon={CalendarClock} tone="amber" />
            <StatCard label="Cancelled" value={metrics.cancelled} icon={CalendarX} tone="violet" />
            <StatCard label="Registered doctors" value={doctorRows.length} icon={Stethoscope} />
            <StatCard label="Departments" value={departmentRows.length} icon={Building2} tone="sky" />
            <StatCard
              label="Patients served"
              value={new Set(filtered.map((row) => row.patientId)).size}
              icon={UsersRound}
              tone="violet"
            />
            <StatCard
              label="Completion rate"
              value={`${completionRate}%`}
              icon={CalendarCheck}
              tone="amber"
              hint={`Cancellation rate ${cancellationRate}%`}
            />
          </div>

          {metrics.total === 0 ? (
            <ErrorState
              title="No appointments in this period"
              message="Choose a wider date range to see appointment analytics for your hospital."
            />
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <TrendChartCard
                  title="Appointments over time"
                  description="Daily appointment volume in the selected period."
                  points={appointmentsByDay(filtered, Math.min(days, 90))}
                  emptyMessage="No appointment activity in this period"
                />
                <BarChartCard
                  title="Appointments by department"
                  description="Volume per department, based on each doctor's department."
                  points={seriesBy(filtered, (row) => departmentOfRow(row.doctorId))}
                  emptyMessage="No department activity in this period"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <BarChartCard
                  title="Appointments by doctor"
                  description="Busiest doctors in the selected period."
                  points={seriesBy(filtered, (row) => row.doctorName)}
                  emptyMessage="No doctor activity in this period"
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Department activity</CardTitle>
                    <CardDescription>Doctors and appointment volume per department.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {departmentAnalytics.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No departments have been created yet.
                      </p>
                    ) : (
                      <ul className="divide-border divide-y text-sm">
                        {departmentAnalytics.map((item) => (
                          <li
                            key={item.department.id}
                            className="flex items-center justify-between gap-3 py-2 first:pt-0"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {item.department.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {item.doctorCount} doctor
                                {item.doctorCount === 1 ? "" : "s"} ·{" "}
                                {item.department.status === "ACTIVE" ? "Active" : "Inactive"}
                              </span>
                            </span>
                            <span className="tabular-nums">{item.appointmentCount}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
