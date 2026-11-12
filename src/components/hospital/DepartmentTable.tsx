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
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Department } from "@/types";
import { formatDate } from "@/utils/format";

interface DepartmentTableProps {
  departments: Department[];
  doctorCounts: Record<string, number>;
}

export function DepartmentTable({ departments, doctorCounts }: DepartmentTableProps) {
  if (departments.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No departments found"
        description="Create a department to start organising your doctors and clinics."
      />
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Department</TableHead>
              <TableHead>Doctors</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="pl-5 whitespace-normal">
                  <p className="text-sm font-medium">{department.name}</p>
                  <p className="text-muted-foreground text-xs">{department.specialty}</p>
                  <p className="text-muted-foreground mt-0.5 max-w-[26rem] truncate text-xs">
                    {department.description}
                  </p>
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {doctorCounts[department.id] ?? 0}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-normal text-xs">
                  <p>{department.contactPhone ?? "No phone"}</p>
                  <p>{department.contactEmail ?? "No email"}</p>
                  <p>{department.location ?? "No location"}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={department.status === "ACTIVE" ? "secondary" : "outline"}>
                    {department.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Added {formatDate(department.createdAt.slice(0, 10))}
                  </p>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/hospital-admin/departments/${department.id}`}>View</Link>
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
