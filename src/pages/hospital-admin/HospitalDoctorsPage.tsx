import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DoctorTable } from "@/components/hospital/DoctorTable";
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
import { SPECIALTIES, type Specialty } from "@/types";
import { countBy, isDoctorActive } from "./selectors";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "PENDING_INVITATION";

export function HospitalDoctorsPage() {
  const { hospitalId = "" } = useAuth();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "ALL">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const doctors = useServiceQuery(
    () =>
      services.doctors.list({
        hospitalId,
        search,
        specialty: specialty === "ALL" ? undefined : specialty,
      }),
    `doctors:${hospitalId}:${search}:${specialty}`,
  );
  const departments = useServiceQuery(
    () => services.departments.list({ hospitalId }),
    `departments:${hospitalId}`,
  );
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ hospitalId }),
    `appointments:${hospitalId}`,
  );

  const rows = (doctors.data ?? []).filter((doctor) => {
    if (departmentFilter !== "ALL") {
      const key = doctor.departmentId ?? "UNASSIGNED";
      if (key !== departmentFilter) return false;
    }
    if (statusFilter === "ACTIVE") return isDoctorActive(doctor);
    if (statusFilter === "INACTIVE") return !isDoctorActive(doctor);
    if (statusFilter === "PENDING_INVITATION") {
      return doctor.accountStatus === "PENDING_INVITATION";
    }
    return true;
  });

  const appointmentCounts = countBy(appointments.data ?? [], (row) => row.doctorId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Doctors registered at your hospital, their departments and appointment load."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Doctors" },
        ]}
        actions={
          <Button asChild>
            <Link to="/hospital-admin/doctors/new">
              <UserPlus className="size-4" />
              Register doctor
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          ariaLabel="Search doctors"
        />
        <Select
          value={specialty}
          onValueChange={(value) => setSpecialty(value as Specialty | "ALL")}
        >
          <SelectTrigger className="lg:w-52" aria-label="Filter by specialty">
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
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="lg:w-52" aria-label="Filter by department">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
            {(departments.data ?? []).map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="lg:w-48" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Deactivated</SelectItem>
            <SelectItem value="PENDING_INVITATION">Invitation pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : doctors.isLoading ? (
        <ListSkeleton rows={3} />
      ) : doctors.error ? (
        <ErrorState message={doctors.error} onRetry={doctors.refetch} />
      ) : (
        <DoctorTable
          doctors={rows}
          departments={departments.data ?? []}
          appointmentCounts={appointmentCounts}
        />
      )}
    </div>
  );
}
