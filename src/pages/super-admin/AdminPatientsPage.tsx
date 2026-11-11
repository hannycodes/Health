import { useState } from "react";
import { UsersRound } from "lucide-react";

import { TablePagination } from "@/components/admin/TablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACCOUNT_STATUS_META } from "@/constants";
import { usePagination } from "@/hooks/usePagination";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { ACCOUNT_STATUSES, type AccountStatus } from "@/types";
import { formatDate } from "@/utils/format";

type StatusFilter = "ALL" | AccountStatus;

export function AdminPatientsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.patients.list(),
    "patients",
  );

  const patients = (data ?? []).filter((patient) => {
    if (status !== "ALL" && (patient.status ?? "ACTIVE") !== status) return false;
    const term = search.trim().toLowerCase();
    if (
      term &&
      !`${patient.id} ${patient.fullName} ${patient.email}`
        .toLowerCase()
        .includes(term)
    ) {
      return false;
    }
    return true;
  });

  const pagination = usePagination(patients, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient directory"
        description="Registered patient accounts for platform administration only. Medical histories, AI conversations and uploaded images are deliberately excluded."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Patients" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by patient ID, name or email"
          ariaLabel="Search patients"
        />
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

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No patients match these filters"
          description="Adjust the search term or account status."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {patients.length} patient{patients.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Registered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageRows.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="text-muted-foreground text-xs">
                      {patient.id}
                    </TableCell>
                    <TableCell className="max-w-[16rem]">
                      <span className="block truncate font-medium">
                        {patient.fullName}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {patient.email}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {patient.phone ?? "Not provided"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(patient.createdAt.slice(0, 10))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        kind="account"
                        value={patient.status ?? "ACTIVE"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
