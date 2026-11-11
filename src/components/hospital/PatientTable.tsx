import { Link } from "react-router-dom";
import { UsersRound } from "lucide-react";

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
import { EmptyState } from "@/components/common/EmptyState";
import type { PatientRow } from "@/pages/hospital-admin/selectors";
import { formatDate } from "@/utils/format";

interface PatientTableProps {
  rows: PatientRow[];
}

export function PatientTable({ rows }: PatientTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="No patients found"
        description="Patients appear here once they have an appointment at your hospital."
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
              <TableHead>Contact</TableHead>
              <TableHead>Appointments</TableHead>
              <TableHead>Last visit</TableHead>
              <TableHead>Upcoming</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.patient.id}>
                <TableCell className="pl-5 whitespace-normal">
                  <p className="text-sm font-medium">{row.patient.fullName}</p>
                  <p className="text-muted-foreground text-xs">{row.patient.id}</p>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-normal text-xs">
                  <p>{row.patient.phone ?? "No phone"}</p>
                  <p className="max-w-[14rem] truncate">{row.patient.email}</p>
                </TableCell>
                <TableCell className="text-sm tabular-nums">{row.appointmentCount}</TableCell>
                <TableCell className="text-sm">
                  {row.lastVisit ? formatDate(row.lastVisit) : "No completed visit"}
                </TableCell>
                <TableCell className="text-sm">
                  {row.upcoming ?? <span className="text-muted-foreground">None</span>}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/hospital-admin/patients/${row.patient.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
