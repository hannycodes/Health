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
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function PatientHospitals() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useServiceQuery(
    () => services.hospitals.list({ approvalStatus: "APPROVED", search }),
    search,
  );

  const hospitals = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospitals"
        description="Approved partner hospitals you can book an appointment with."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Hospitals" }]}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by hospital or city"
        ariaLabel="Search hospitals"
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : hospitals.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hospitals found"
          description="Try a different search term or clear the filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hospitals.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to="/patient/doctors">View doctors</Link>
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
