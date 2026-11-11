import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { HospitalCard } from "@/components/hospitals/HospitalCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { SPECIALTIES, type Specialty } from "@/types";

type SpecialtyFilter = Specialty | "ALL";

export function PatientHospitals() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<SpecialtyFilter>("ALL");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.hospitals.list({ approvalStatus: "APPROVED", search }),
    search,
  );

  const hospitals = (data ?? []).filter(
    (hospital) =>
      specialty === "ALL" || hospital.specialties.includes(specialty),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospitals"
        description="Approved MyHealth partner hospitals. Search by name or city, then open a hospital to see its departments and doctors."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Hospitals" }]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by hospital name or city"
          ariaLabel="Search hospitals"
        />
        <Select
          value={specialty}
          onValueChange={(value) => setSpecialty(value as SpecialtyFilter)}
        >
          <SelectTrigger className="sm:w-64" aria-label="Filter by department">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {SPECIALTIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : hospitals.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hospitals match your filters"
          description="Try a different search term or department."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSpecialty("ALL");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hospitals.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/patient/hospitals/${hospital.id}`}>View details</Link>
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
