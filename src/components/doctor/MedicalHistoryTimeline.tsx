import { Link } from "react-router-dom";
import { Activity, CalendarDays, FileText, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentWithDetails, Doctor, Hospital, MedicalRecord } from "@/types";
import { formatDate, formatDateTime } from "@/utils/format";

export type TimelineEntry =
  | { kind: "record"; id: string; date: string; record: MedicalRecord }
  | { kind: "appointment"; id: string; date: string; appointment: AppointmentWithDetails };

interface MedicalHistoryTimelineProps {
  records: MedicalRecord[];
  appointments: AppointmentWithDetails[];
  doctors: Doctor[];
  hospitals: Hospital[];
  patientId: string;
}

function TimelineDot({ icon: Icon }: { icon: typeof FileText }) {
  return (
    <span className="bg-secondary text-secondary-foreground ring-background flex size-8 shrink-0 items-center justify-center rounded-full ring-4">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

/** Chronological patient history built only from fields the model stores. */
export function MedicalHistoryTimeline({
  records,
  appointments,
  doctors,
  hospitals,
  patientId,
}: MedicalHistoryTimelineProps) {
  const doctorName = (id: string) =>
    doctors.find((doctor) => doctor.id === id)?.fullName ?? "Unknown doctor";
  const hospitalName = (id: string) =>
    hospitals.find((hospital) => hospital.id === id)?.name ?? null;

  const entries: TimelineEntry[] = [
    ...records.map<TimelineEntry>((record) => ({
      kind: "record",
      id: `rec-${record.id}`,
      date: record.recordedAt,
      record,
    })),
    ...appointments.map<TimelineEntry>((appointment) => ({
      kind: "appointment",
      id: `apt-${appointment.id}`,
      date: `${appointment.date}T${appointment.startTime}:00`,
      appointment,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          No consultations or appointments are recorded for this patient yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-4 -left-[2.15rem]">
            <TimelineDot icon={entry.kind === "record" ? FileText : CalendarDays} />
          </span>

          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.kind === "record"
                      ? entry.record.diagnosis || "Consultation record"
                      : entry.appointment.reason}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {entry.kind === "record"
                      ? `${doctorName(entry.record.doctorId)}${
                          hospitalName(entry.record.hospitalId)
                            ? ` · ${hospitalName(entry.record.hospitalId)}`
                            : ""
                        } · ${formatDateTime(entry.record.recordedAt)}`
                      : `${formatDate(entry.appointment.date)} · ${entry.appointment.startTime} – ${entry.appointment.endTime} · ${
                          hospitalName(entry.appointment.hospitalId) ?? "Unknown hospital"
                        }`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {entry.kind === "record" ? "Clinical record" : "Appointment"}
                  </Badge>
                  {entry.kind === "appointment" && (
                    <StatusBadge kind="appointment" value={entry.appointment.status} />
                  )}
                </div>
              </div>

              {entry.kind === "record" ? (
                <div className="space-y-2 text-sm">
                  {entry.record.treatment && (
                    <div>
                      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                        Treatment
                      </p>
                      <p>{entry.record.treatment}</p>
                    </div>
                  )}
                  {entry.record.prescription.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                        Prescription
                      </p>
                      <ul className="mt-0.5 list-disc pl-4">
                        {entry.record.prescription.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {entry.record.notes && (
                    <p className="text-muted-foreground">{entry.record.notes}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to={`/doctor/patients/${patientId}/records/${entry.record.id}`}
                      >
                        <Activity className="size-4" />
                        Open record
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/doctor/patients/${patientId}`}>
                        <Stethoscope className="size-4" />
                        Patient overview
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/doctor/appointments/${entry.appointment.id}`}>
                      View appointment
                    </Link>
                  </Button>
                  {entry.appointment.status === "COMPLETED" && (
                    <Button size="sm" asChild>
                      <Link
                        to={`/doctor/patients/${patientId}/records/new?appointmentId=${entry.appointment.id}`}
                      >
                        <FileText className="size-4" />
                        Add record
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
