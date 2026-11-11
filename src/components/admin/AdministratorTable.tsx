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
import type { HospitalAdminWithHospital } from "@/types";
import { formatDate } from "@/utils/format";

interface AdministratorTableProps {
  administrators: HospitalAdminWithHospital[];
  actions?: (administrator: HospitalAdminWithHospital) => ReactNode;
}

export function AdministratorTable({
  administrators,
  actions,
}: AdministratorTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Administrator</TableHead>
          <TableHead>Assigned hospital</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Registered</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {administrators.map((admin) => (
          <TableRow key={admin.id}>
            <TableCell className="max-w-[16rem]">
              <span className="block truncate font-medium">{admin.fullName}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {admin.email}
              </span>
            </TableCell>
            <TableCell>{admin.hospitalName}</TableCell>
            <TableCell>
              <StatusBadge kind="account" value={admin.status ?? "ACTIVE"} />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatDate(admin.createdAt.slice(0, 10))}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <div className="flex justify-end gap-2">{actions?.(admin)}</div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
