import { Link } from "react-router-dom";
import { CalendarDays, Stethoscope } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentWithDetails } from "@/types";
import { formatTimeRange } from "@/utils/format";

interface TodayScheduleProps {
  appointments: AppointmentWithDetails[];
}

/** Today's visits in chronological order, with the two row actions. */
export function TodaySchedule({ appointments }: TodayScheduleProps) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No appointments today"
        description="Booked visits for today will appear here in time order."
      />
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="divide-y px-0">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="bg-secondary text-secondary-foreground flex w-16 shrink-0 flex-col items-center rounded-lg px-2 py-1.5">
                <span className="text-sm font-semibold tabular-nums">
                  {appointment.startTime}
                </span>
                <span className="text-[10px] tracking-wide uppercase">
                  {formatTimeRange(appointment.startTime, appointment.endTime)
                    .split("–")[1]
                    ?.trim() ?? ""}
                </span>
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{appointment.patientName}</p>
                  <StatusBadge kind="appointment" value={appointment.status} />
                </div>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {appointment.reason}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/doctor/patients/${appointment.patientId}`}>
                  <Stethoscope className="size-4" />
                  Patient
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to={`/doctor/appointments/${appointment.id}`}>Appointment</Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
