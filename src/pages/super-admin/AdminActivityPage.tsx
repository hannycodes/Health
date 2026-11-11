import { useState } from "react";
import { Activity } from "lucide-react";

import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { TablePagination } from "@/components/admin/TablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTION_LABELS } from "@/constants";
import { usePagination } from "@/hooks/usePagination";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { AUDIT_ACTIONS, type AuditAction } from "@/types";

type ActionFilter = "ALL" | AuditAction;

export function AdminActivityPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<ActionFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () =>
      services.auditLogs.list({
        search,
        action: action === "ALL" ? undefined : action,
        from: from || undefined,
        to: to || undefined,
      }),
    `${search}:${action}:${from}:${to}`,
  );

  const logs = data ?? [];
  const pagination = usePagination(logs, 12);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity and audit logs"
        description="Administrative actions recorded by the backend. Audit records are read-only and cannot be edited or deleted from this interface."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Activity" },
        ]}
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search action, actor, entity or details"
            ariaLabel="Search audit logs"
          />
          <Select
            value={action}
            onValueChange={(value) => setAction(value as ActionFilter)}
          >
            <SelectTrigger className="w-64" aria-label="Filter by action type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All action types</SelectItem>
              {AUDIT_ACTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {AUDIT_ACTION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-40 space-y-1">
            <Label htmlFor="audit-from" className="text-xs">
              From
            </Label>
            <Input
              id="audit-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="w-40 space-y-1">
            <Label htmlFor="audit-to" className="text-xs">
              To
            </Label>
            <Input
              id="audit-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No audit records match these filters"
          description="Try a different action type or date range."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {logs.length} record{logs.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AuditLogTable logs={pagination.pageRows} />
            <TablePagination
              total={pagination.total}
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
