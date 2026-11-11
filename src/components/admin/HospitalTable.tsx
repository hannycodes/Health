import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HOSPITAL_TYPE_LABELS } from "@/constants";
import type { Hospital } from "@/types";
import { formatDate } from "@/utils/format";

interface HospitalTableProps {
  hospitals: Hospital[];
  actions?: (hospital: Hospital) => ReactNode;
}

export function HospitalTable({ hospitals, actions }: HospitalTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hospital</TableHead>
          <TableHead className="hidden md:table-cell">Type</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="hidden lg:table-cell">Contact</TableHead>
          <TableHead className="hidden lg:table-cell">Registered</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden xl:table-cell">Doctors</TableHead>
          {actions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {hospitals.map((hospital) => (
          <TableRow key={hospital.id}>
            <TableCell className="max-w-[18rem]">
              <Link
                to={`/admin/hospitals/${hospital.id}`}
                className="hover:text-primary block truncate font-medium hover:underline"
              >
                {hospital.name}
              </Link>
              <span className="text-muted-foreground text-xs">{hospital.id}</span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {hospital.hospitalType
                ? HOSPITAL_TYPE_LABELS[hospital.hospitalType]
                : "—"}
            </TableCell>
            <TableCell>{hospital.city}</TableCell>
            <TableCell className="hidden lg:table-cell">
              <span className="block text-xs">{hospital.email}</span>
              <span className="text-muted-foreground block text-xs">
                {hospital.phone}
              </span>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {formatDate(hospital.createdAt.slice(0, 10))}
            </TableCell>
            <TableCell>
              <StatusBadge kind="hospital" value={hospital.approvalStatus} />
            </TableCell>
            <TableCell className="hidden xl:table-cell">
              {hospital.capacity.totalDoctors}
            </TableCell>
            {actions && (
              <TableCell className="text-right whitespace-nowrap">
                <div className="flex justify-end gap-2">{actions(hospital)}</div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
