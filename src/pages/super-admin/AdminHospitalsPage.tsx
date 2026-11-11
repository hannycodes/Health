import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ShieldCheck } from "lucide-react";

import { HospitalApprovalDialog } from "@/components/admin/HospitalApprovalDialog";
import { HospitalTable } from "@/components/admin/HospitalTable";
import { TablePagination } from "@/components/admin/TablePagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOSPITAL_APPROVAL_META, HOSPITAL_TYPE_LABELS } from "@/constants";
import { usePagination } from "@/hooks/usePagination";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import {
  HOSPITAL_APPROVAL_STATUSES,
  HOSPITAL_TYPES,
  type HospitalApprovalStatus,
  type HospitalType,
} from "@/types";

type StatusFilter = "ALL" | HospitalApprovalStatus;
type TypeFilter = "ALL" | HospitalType;

export function AdminHospitalsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.hospitals.list({ search }),
    search,
  );

  const hospitals = (data ?? [])
    .filter((hospital) => {
      if (status !== "ALL" && hospital.approvalStatus !== status) return false;
      if (type !== "ALL" && hospital.hospitalType !== type) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pagination = usePagination(hospitals, 8);
  const pendingCount = (data ?? []).filter(
    (hospital) => hospital.approvalStatus === "PENDING",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital management"
        description="Every hospital and application registered on MyHealth, with its approval state."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Hospitals" },
        ]}
        actions={
          <Button asChild variant={pendingCount > 0 ? "default" : "outline"}>
            <Link to="/admin/hospitals/pending">
              <ShieldCheck className="size-4" />
              Pending applications ({pendingCount})
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by hospital or city"
          ariaLabel="Search hospitals"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger className="w-48" aria-label="Filter by approval status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {HOSPITAL_APPROVAL_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {HOSPITAL_APPROVAL_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={(value) => setType(value as TypeFilter)}>
            <SelectTrigger className="w-44" aria-label="Filter by hospital type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {HOSPITAL_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {HOSPITAL_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : hospitals.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hospitals match these filters"
          description="Adjust the search or filters to see more results."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {hospitals.length} hospital{hospitals.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HospitalTable
              hospitals={pagination.pageRows}
              actions={(hospital) => (
                <>
                  {hospital.approvalStatus === "PENDING" && (
                    <HospitalApprovalDialog
                      hospital={hospital}
                      mode="approve"
                      trigger={
                        <Button size="sm" variant="outline">
                          Approve
                        </Button>
                      }
                    />
                  )}
                  {hospital.approvalStatus === "APPROVED" && (
                    <HospitalApprovalDialog
                      hospital={hospital}
                      mode="suspend"
                      trigger={
                        <Button size="sm" variant="outline">
                          Suspend
                        </Button>
                      }
                    />
                  )}
                  {hospital.approvalStatus === "SUSPENDED" && (
                    <HospitalApprovalDialog
                      hospital={hospital}
                      mode="reactivate"
                      trigger={<Button size="sm">Reactivate</Button>}
                    />
                  )}
                </>
              )}
            />
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
