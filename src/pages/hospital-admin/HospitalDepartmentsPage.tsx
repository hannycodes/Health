import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DepartmentTable } from "@/components/hospital/DepartmentTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { SPECIALTIES, type DepartmentStatus, type Specialty } from "@/types";
import { countBy } from "./selectors";

export function HospitalDepartmentsPage() {
  const { hospitalId = "" } = useAuth();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "ALL">("ALL");
  const [status, setStatus] = useState<DepartmentStatus | "ALL">("ALL");

  const departments = useServiceQuery(
    () =>
      services.departments.list({
        hospitalId,
        search,
        specialty: specialty === "ALL" ? undefined : specialty,
        status: status === "ALL" ? undefined : status,
      }),
    `departments:${hospitalId}:${search}:${specialty}:${status}`,
  );

  const doctors = useServiceQuery(
    () => services.doctors.list({ hospitalId }),
    `doctors:${hospitalId}`,
  );

  const doctorCounts = countBy(
    doctors.data ?? [],
    (doctor) => doctor.departmentId ?? "UNASSIGNED",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Clinical departments and specialties offered by your hospital."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Departments" },
        ]}
        actions={
          <Button asChild>
            <Link to="/hospital-admin/departments/new">
              <Plus className="size-4" />
              New department
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search departments"
          ariaLabel="Search departments"
        />
        <Select
          value={specialty}
          onValueChange={(value) => setSpecialty(value as Specialty | "ALL")}
        >
          <SelectTrigger className="lg:w-56" aria-label="Filter by specialty">
            <SelectValue placeholder="All specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All specialties</SelectItem>
            {SPECIALTIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as DepartmentStatus | "ALL")}
        >
          <SelectTrigger className="lg:w-44" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : departments.isLoading ? (
        <ListSkeleton rows={3} />
      ) : departments.error ? (
        <ErrorState message={departments.error} onRetry={departments.refetch} />
      ) : (
        <DepartmentTable
          departments={departments.data ?? []}
          doctorCounts={doctorCounts}
        />
      )}
    </div>
  );
}
