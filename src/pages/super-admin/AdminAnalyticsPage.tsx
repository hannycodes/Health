import { useState } from "react";
import {
  Building2,
  CalendarDays,
  CalendarX,
  ClipboardCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { AnalyticsBarCard } from "@/components/admin/AnalyticsCharts";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import type { AnalyticsRange } from "@/types";

export function AdminAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const summary = useServiceQuery(() => services.analytics.getSummary(), "summary");
  const growth = useServiceQuery(
    () =>
      services.analytics.getGrowth({
        range,
        from: range === "custom" ? from || undefined : undefined,
        to: range === "custom" ? to || undefined : undefined,
      }),
    `${range}:${from}:${to}`,
  );

  const series = growth.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform analytics"
        description="Hospital growth, user registrations and appointment activity across MyHealth."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Analytics" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44 space-y-1.5">
          <Label htmlFor="range">Date range</Label>
          <Select value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}>
            <SelectTrigger id="range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {range === "custom" && (
          <>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </>
        )}

        <Button variant="outline" onClick={() => growth.refetch()}>
          Refresh
        </Button>
      </div>

      {summary.isLoading ? (
        <ListSkeleton rows={2} />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : summary.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Hospitals"
            value={summary.data.totalHospitals}
            icon={Building2}
            hint={`${summary.data.approvedHospitals} approved · ${summary.data.pendingHospitals} pending`}
          />
          <StatCard
            label="Users"
            value={summary.data.totalUsers}
            icon={Users}
            tone="sky"
            hint={`${summary.data.totalAdministrators} administrators`}
          />
          <StatCard
            label="Doctors"
            value={summary.data.totalDoctors}
            icon={Stethoscope}
            tone="violet"
          />
          <StatCard
            label="Appointments"
            value={summary.data.totalAppointments}
            icon={CalendarDays}
            hint={`${summary.data.upcomingAppointments} upcoming`}
          />
        </div>
      ) : null}

      {growth.isLoading ? (
        <ListSkeleton rows={2} />
      ) : growth.error ? (
        <ErrorState message={growth.error} onRetry={growth.refetch} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsBarCard
            title="Hospital registrations"
            description="New hospitals submitted per period."
            data={series.map((point) => ({
              label: point.label,
              value: point.hospitals,
            }))}
          />
          <AnalyticsBarCard
            title="Hospital approvals"
            description="Hospitals approved per period."
            tone="sky"
            data={series.map((point) => ({
              label: point.label,
              value: point.approvedHospitals,
            }))}
          />
          <AnalyticsBarCard
            title="Patient registrations"
            description="New patient accounts per period."
            data={series.map((point) => ({
              label: point.label,
              value: point.patients,
            }))}
          />
          <AnalyticsBarCard
            title="Doctor registrations"
            description="Doctors onboarded per period."
            tone="amber"
            data={series.map((point) => ({
              label: point.label,
              value: point.doctors,
            }))}
          />
        </div>
      )}

      {summary.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total appointments",
                value: summary.data.totalAppointments,
                icon: CalendarDays,
              },
              {
                label: "Completed",
                value: summary.data.completedAppointments,
                icon: ClipboardCheck,
              },
              {
                label: "Cancelled",
                value: summary.data.cancelledAppointments,
                icon: CalendarX,
              },
              {
                label: "Upcoming",
                value: summary.data.upcomingAppointments,
                icon: CalendarDays,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase">
                  <item.icon className="size-3.5" />
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        Figures are calculated by the platform API from current hospital, user and
        appointment records.
      </p>
    </div>
  );
}
