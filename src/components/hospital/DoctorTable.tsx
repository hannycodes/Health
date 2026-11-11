import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Department, Doctor } from "@/types";
import { getInitials } from "@/utils/format";
import { departmentNameOf, isDoctorActive } from "@/pages/hospital-admin/selectors";

interface DoctorTableProps {
  doctors: Doctor[];
  departments: Department[];
  appointmentCounts: Record<string, number>;
}

export function DoctorTable({ doctors, departments, appointmentCounts }: DoctorTableProps) {
  if (doctors.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No doctors match your filters"
        description="Try another specialty or department, or register a new doctor."
      />
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Doctor</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Appointments</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor) => {
              const active = isDoctorActive(doctor);
              return (
                <TableRow key={doctor.id}>
                  <TableCell className="pl-5 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <span className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-full text-xs font-semibold">
                        {getInitials(doctor.fullName)}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{doctor.fullName}</p>
                        <p className="text-muted-foreground text-xs">{doctor.email}</p>
                        <p className="text-muted-foreground text-xs">
                          {doctor.phone ?? "No phone"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{doctor.specialty}</TableCell>
                  <TableCell className="text-sm">
                    {departmentNameOf(departments, doctor.departmentId)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={active ? "secondary" : "outline"}>
                        {active ? "Active" : "Deactivated"}
                      </Badge>
                      {doctor.accountStatus === "PENDING_INVITATION" && (
                        <Badge variant="outline">Invitation pending</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {appointmentCounts[doctor.id] ?? 0}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/hospital-admin/doctors/${doctor.id}`}>View</Link>
                    </Button>
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
