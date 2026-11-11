import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AUDIT_ACTION_LABELS } from "@/constants";
import type { AuditLog } from "@/types";
import { formatDateTime } from "@/utils/format";

/** Read-only: audit records are never editable from the UI. */
export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead className="hidden lg:table-cell">Actor</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead className="hidden xl:table-cell">Details</TableHead>
          <TableHead className="hidden md:table-cell">When</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">
              {AUDIT_ACTION_LABELS[log.action]}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <span className="block text-sm">{log.actorName}</span>
              <span className="text-muted-foreground text-xs">{log.actorId}</span>
            </TableCell>
            <TableCell className="max-w-[16rem]">
              <span className="block truncate">{log.entityLabel}</span>
              <span className="text-muted-foreground text-xs">
                {log.entityType}
              </span>
            </TableCell>
            <TableCell className="hidden max-w-[24rem] whitespace-normal xl:table-cell">
              <span className="text-muted-foreground text-xs">
                {log.description}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell whitespace-nowrap">
              {formatDateTime(log.createdAt)}
            </TableCell>
            <TableCell>
              <Badge
                variant={log.result === "SUCCESS" ? "secondary" : "destructive"}
              >
                {log.result === "SUCCESS" ? "Success" : "Failed"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
