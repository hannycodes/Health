import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppointmentWithDetails } from "@/types";
import { formatDate, formatTimeRange } from "@/utils/format";

type Perspective = "patient" | "doctor" | "hospital-admin" | "super-admin";

interface AppointmentTableProps {
  appointments: AppointmentWithDetails[];
  perspective: Perspective;
  actions?: (appointment: AppointmentWithDetails) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * One appointment table for all four dashboards.
 *
 * Columns adapt to the viewer, but the data and status semantics are identical
 * everywhere because every role reads the same AppointmentService.
 */
export function AppointmentTable({
  appointments,
  perspective,
  actions,
  emptyTitle = "No appointments yet",
  emptyDescription = "Appointments booked by patients will appear here.",
}: AppointmentTableProps) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const showDoctor = perspective !== "doctor";
  const showPatient = perspective !== "patient";

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Date & time</TableHead>
              {showPatient && <TableHead>Patient</TableHead>}
              {showDoctor && <TableHead>Doctor</TableHead>}
              {perspective === "super-admin" && <TableHead>Hospital</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              {actions && <TableHead className="pr-5 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell className="pl-5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{formatDate(appointment.date)}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatTimeRange(appointment.startTime, appointment.endTime)}
                    </p>
                  </div>
                </TableCell>
                {showPatient && (
                  <TableCell>
                    <p className="text-sm">{appointment.patientName}</p>
                    <p className="text-muted-foreground max-w-[16rem] truncate text-xs">
                      {appointment.reason}
                    </p>
                  </TableCell>
                )}
                {showDoctor && (
                  <TableCell>
                    <p className="text-sm">{appointment.doctorName}</p>
                    <p className="text-muted-foreground text-xs">
                      {appointment.doctorSpecialty}
                    </p>
                    {perspective === "patient" && (
                      <p className="text-muted-foreground text-xs">
                        {appointment.hospitalName}
                      </p>
                    )}
                  </TableCell>
                )}
                {perspective === "super-admin" && (
                  <TableCell className="text-sm">{appointment.hospitalName}</TableCell>
                )}
                <TableCell>
                  <StatusBadge kind="appointment" value={appointment.status} />
                </TableCell>
                <TableCell>
                  {appointment.paymentStatus ? (
                    <StatusBadge kind="payment" value={appointment.paymentStatus} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                {actions && (
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1.5">{actions(appointment)}</div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
