import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AppointmentWithDetails } from "@/types";
import { formatDate, todayISO } from "@/utils/format";

type CalendarView = "day" | "week" | "month";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toISO(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromISO(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function addDays(iso: string, days: number) {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

function startOfWeek(iso: string) {
  const date = fromISO(iso);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toISO(date);
}

function addMonths(iso: string, months: number) {
  const date = fromISO(iso);
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return toISO(first);
}

function monthLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    fromISO(iso),
  );
}

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fromISO(iso));
}

function AppointmentChip({ appointment }: { appointment: AppointmentWithDetails }) {
  return (
    <Link
      to={`/hospital-admin/appointments/${appointment.id}`}
      className={cn(
        "block rounded-md border px-2 py-1.5 text-xs transition-colors hover:bg-muted",
        appointment.status === "CANCELLED" && "opacity-60",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium tabular-nums">{appointment.startTime}</span>
        <StatusBadge kind="appointment" value={appointment.status} className="px-1.5 py-0" />
      </span>
      <span className="mt-0.5 block truncate">{appointment.patientName}</span>
      <span className="text-muted-foreground block truncate text-[11px]">
        {appointment.doctorName}
      </span>
    </Link>
  );
}

interface AppointmentCalendarProps {
  appointments: AppointmentWithDetails[];
}

/**
 * Calendar over the shared appointment records. It never owns appointment
 * state — it renders whatever the hospital-scoped appointment query returned.
 */
export function AppointmentCalendar({ appointments }: AppointmentCalendarProps) {
  const [view, setView] = useState<CalendarView>("day");
  const [anchor, setAnchor] = useState(() => todayISO());

  const byDate = appointments.reduce<Record<string, AppointmentWithDetails[]>>(
    (groups, appointment) => {
      groups[appointment.date] = [...(groups[appointment.date] ?? []), appointment];
      return groups;
    },
    {},
  );

  const sortByTime = (rows: AppointmentWithDetails[]) =>
    [...rows].sort((a, b) => a.startTime.localeCompare(b.startTime));

  function shift(direction: -1 | 1) {
    if (view === "day") setAnchor((current) => addDays(current, direction));
    if (view === "week") setAnchor((current) => addDays(current, direction * 7));
    if (view === "month") setAnchor((current) => addMonths(current, direction));
  }

  const rangeLabel =
    view === "day"
      ? dayLabel(anchor)
      : view === "week"
        ? `${dayLabel(startOfWeek(anchor))} – ${dayLabel(addDays(startOfWeek(anchor), 6))}`
        : monthLabel(anchor);

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(startOfWeek(anchor), index),
  );

  const monthStart = `${anchor.slice(0, 7)}-01`;
  const monthGridStart = startOfWeek(monthStart);
  const monthCells = Array.from({ length: 42 }, (_, index) =>
    addDays(monthGridStart, index),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous period"
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next period"
            onClick={() => shift(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(todayISO())}>
            Today
          </Button>
          <p className="ml-2 text-sm font-medium">{rangeLabel}</p>
        </div>

        <Tabs value={view} onValueChange={(value) => setView(value as CalendarView)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "day" && (
        <Card>
          <CardContent>
            {sortByTime(byDate[anchor] ?? []).length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments on this day"
                description="Choose another day, or switch to the week view to see the schedule."
              />
            ) : (
              <ul className="divide-border divide-y">
                {sortByTime(byDate[anchor] ?? []).map((appointment) => (
                  <li key={appointment.id} className="flex flex-wrap gap-3 py-3 first:pt-0">
                    <span className="w-16 text-sm font-semibold tabular-nums">
                      {appointment.startTime}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{appointment.patientName}</p>
                      <p className="text-muted-foreground text-xs">
                        {appointment.doctorName} · {appointment.doctorSpecialty}
                      </p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {appointment.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge kind="appointment" value={appointment.status} />
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/hospital-admin/appointments/${appointment.id}`}>
                          Details
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {view === "week" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => {
            const rows = sortByTime(byDate[day] ?? []);
            return (
              <Card
                key={day}
                className={cn("py-3", day === todayISO() && "border-primary/40")}
              >
                <CardContent className="space-y-2 px-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold">
                      {new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(
                        fromISO(day),
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {fromISO(day).getDate()}
                    </p>
                  </div>
                  {rows.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-[11px]">No appointments</p>
                  ) : (
                    rows.map((appointment) => (
                      <AppointmentChip key={appointment.id} appointment={appointment} />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <Card className="py-3">
          <CardContent className="px-3">
            <div className="text-muted-foreground grid grid-cols-7 gap-1 pb-2 text-[11px] font-medium uppercase">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day} className="px-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((day) => {
                const rows = sortByTime(byDate[day] ?? []);
                const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setAnchor(day);
                      setView("day");
                    }}
                    className={cn(
                      "min-h-20 rounded-md border p-1.5 text-left transition-colors hover:bg-muted",
                      !inMonth && "opacity-40",
                      day === todayISO() && "border-primary/50",
                    )}
                    aria-label={`${formatDate(day)}, ${rows.length} appointments`}
                  >
                    <span className="text-xs font-medium tabular-nums">
                      {fromISO(day).getDate()}
                    </span>
                    <span className="mt-1 flex flex-col gap-0.5">
                      {rows.slice(0, 2).map((appointment) => (
                        <span
                          key={appointment.id}
                          className="bg-secondary text-secondary-foreground truncate rounded px-1 text-[10px]"
                        >
                          {appointment.startTime} {appointment.patientName}
                        </span>
                      ))}
                      {rows.length > 2 && (
                        <span className="text-muted-foreground text-[10px]">
                          +{rows.length - 2} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
