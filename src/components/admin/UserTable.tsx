import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS } from "@/constants";
import type { PlatformUser } from "@/types";
import { formatDate } from "@/utils/format";

interface UserTableProps {
  users: PlatformUser[];
  actions?: (user: PlatformUser) => ReactNode;
  showId?: boolean;
}

export function UserTable({ users, actions, showId = true }: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showId && <TableHead>ID</TableHead>}
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Hospital</TableHead>
          <TableHead className="hidden md:table-cell">Registered</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            {showId && (
              <TableCell className="text-muted-foreground text-xs">
                {user.id}
              </TableCell>
            )}
            <TableCell className="max-w-[16rem]">
              <Link
                to={`/admin/users/${user.id}`}
                className="hover:text-primary block truncate font-medium hover:underline"
              >
                {user.fullName}
              </Link>
              <span className="text-muted-foreground block truncate text-xs">
                {user.email}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
            </TableCell>
            <TableCell>
              <StatusBadge kind="account" value={user.status ?? "ACTIVE"} />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {user.hospitalName ?? "—"}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatDate(user.createdAt.slice(0, 10))}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <div className="flex justify-end gap-2">
                <Link
                  to={`/admin/users/${user.id}`}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  View
                </Link>
                {actions?.(user)}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
