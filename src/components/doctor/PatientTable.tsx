import { Link } from "react-router-dom";
import { UsersRound } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppointmentWithDetails, Patient } from "@/types";
import { formatDate } from "@/utils/format";
import { ageLabel } from "@/features/doctor/utils";

interface PatientTableProps {
  patients: Patient[];
  appointments: AppointmentWithDetails[];
}

/** Authorized patients with their most recent visit. */
export function PatientTable({ patients, appointments }: PatientTableProps) {
  if (patients.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="No patients in your care yet"
        description="Patients appear once they book an appointment with you or you record a consultation."
      />
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Patient</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Blood type</TableHead>
              <TableHead>Most recent visit</TableHead>
              <TableHead>Next visit</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => {
              const visits = appointments
                .filter((appointment) => appointment.patientId === patient.id)
                .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
              const past = visits.filter((visit) => visit.status !== "CANCELLED").at(-1);
              const next = visits.find((visit) => visit.status === "BOOKED");

              return (
                <TableRow key={patient.id}>
                  <TableCell className="pl-5">
                    <Link
                      to={`/doctor/patients/${patient.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {patient.fullName}
                    </Link>
                    <p className="text-muted-foreground text-xs">{patient.id}</p>
                  </TableCell>
                  <TableCell className="text-sm">{ageLabel(patient.dateOfBirth)}</TableCell>
                  <TableCell className="text-sm">{patient.bloodType ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {past ? (
                      <div>
                        <p>{formatDate(past.date)}</p>
                        <p className="text-muted-foreground text-xs">{past.reason}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">No visits yet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {next ? formatDate(next.date) : "—"}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/doctor/patients/${patient.id}`}>Overview</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link to={`/doctor/patients/${patient.id}/history`}>History</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
