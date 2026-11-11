import { useState } from "react";
import { Stethoscope } from "lucide-react";

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
import {
  ACCOUNT_STATUSES,
  SPECIALTIES,
  type AccountStatus,
  type Specialty,
} from "@/types";
import { formatDate } from "@/utils/format";

type StatusFilter = "ALL" | AccountStatus;
type SpecialtyFilter = "ALL" | Specialty;

export function AdminDoctorsPage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<SpecialtyFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [hospitalId, setHospitalId] = useState<string>("ALL");

  const doctorsQuery = useServiceQuery(() => services.doctors.list(), "doctors");
  const hospitalsQuery = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const hospitalName = (id: string) =>
    (hospitalsQuery.data ?? []).find((hospital) => hospital.id === id)?.name ??
    id;

  const doctors = (doctorsQuery.data ?? []).filter((doctor) => {
    if (specialty !== "ALL" && doctor.specialty !== specialty) return false;
    if (status !== "ALL" && (doctor.status ?? "ACTIVE") !== status) return false;
    if (hospitalId !== "ALL" && doctor.hospitalId !== hospitalId) return false;
    const term = search.trim().toLowerCase();
    if (
      term &&
      !`${doctor.fullName} ${doctor.email} ${doctor.specialty}`
        .toLowerCase()
        .includes(term)
    ) {
      return false;
    }
    return true;
  });

  const pagination = usePagination(doctors, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor directory"
        description="Platform oversight of registered doctors and their hospital affiliation. Clinical workflows live in the Doctor Portal."
        breadcrumbs={[
          { label: "Platform admin", to: "/admin/dashboard" },
          { label: "Doctors" },
        ]}
      />

      <div className="flex flex-col gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email or specialty"
          ariaLabel="Search doctors"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={specialty}
            onValueChange={(value) => setSpecialty(value as SpecialtyFilter)}
          >
            <SelectTrigger className="w-52" aria-label="Filter by specialty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All specialties</SelectItem>
              {SPECIALTIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={hospitalId} onValueChange={setHospitalId}>
            <SelectTrigger className="w-56" aria-label="Filter by hospital">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All hospitals</SelectItem>
              {(hospitalsQuery.data ?? []).map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id}>
                  {hospital.name}
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

      {doctorsQuery.isLoading ? (
        <ListSkeleton rows={5} />
      ) : doctorsQuery.error ? (
        <ErrorState message={doctorsQuery.error} onRetry={doctorsQuery.refetch} />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors match these filters"
          description="Adjust the specialty, hospital or search term."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {doctors.length} doctor{doctors.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead className="hidden lg:table-cell">Hospital</TableHead>
                  <TableHead className="hidden xl:table-cell">Licence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageRows.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="max-w-[16rem]">
                      <span className="block truncate font-medium">
                        {doctor.fullName}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {doctor.email}
                      </span>
                    </TableCell>
                    <TableCell>{doctor.specialty}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {hospitalName(doctor.hospitalId)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {doctor.licenseNumber}
                    </TableCell>
                    <TableCell>
                      <StatusBadge kind="account" value={doctor.status ?? "ACTIVE"} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(doctor.createdAt.slice(0, 10))}
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
