import { useState } from "react";
import { Users } from "lucide-react";

import { TablePagination } from "@/components/admin/TablePagination";
import { UserTable } from "@/components/admin/UserTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_STATUS_META, ROLE_LABELS } from "@/constants";
import { usePagination } from "@/hooks/usePagination";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import {
  ACCOUNT_STATUSES,
  ROLES,
  type AccountStatus,
  type Role,
} from "@/types";

type RoleFilter = "ALL" | Role;
type StatusFilter = "ALL" | AccountStatus;

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () =>
      services.users.list({
        search,
        role: role === "ALL" ? undefined : role,
        status: status === "ALL" ? undefined : status,
      }),
    `${search}:${role}:${status}`,
  );

  const users = data ?? [];
  const pagination = usePagination(users, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform users"
        description="Accounts across every role. This is platform administration, not clinical access — medical records are not shown here."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Users" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email or ID"
          ariaLabel="Search users"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
            <SelectTrigger className="w-44" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              {ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger className="w-44" aria-label="Filter by account status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {ACCOUNT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ACCOUNT_STATUS_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users match these filters"
          description="Try a different role, status or search term."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {users.length} account{users.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <UserTable users={pagination.pageRows} />
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
