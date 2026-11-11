import { useState } from "react";
import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DoctorCard } from "@/components/doctors/DoctorCard";
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

export function PatientDoctors() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<SpecialtyFilter>("ALL");
  const [hospitalId, setHospitalId] = useState("ALL");
  const [availability, setAvailability] = useState("ALL");

  const doctors = useServiceQuery(
    () =>
      services.doctors.list({
        search,
        specialty: specialty === "ALL" ? undefined : specialty,
        hospitalId: hospitalId === "ALL" ? undefined : hospitalId,
        acceptingOnly: availability === "ACCEPTING",
      }),
    `${search}:${specialty}:${hospitalId}:${availability}`,
  );
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const hospitalName = (id: string) =>
    hospitals.data?.find((hospital) => hospital.id === id)?.name;

  const rows = doctors.data ?? [];

  function clearFilters() {
    setSearch("");
    setSpecialty("ALL");
    setHospitalId("ALL");
    setAvailability("ALL");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a doctor"
        description="Filter by specialty, hospital and availability, then open a profile to book."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Doctors" }]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by doctor name"
          ariaLabel="Search doctors"
          className="sm:max-w-none"
        />
        <Select
          value={specialty}
          onValueChange={(value) => setSpecialty(value as SpecialtyFilter)}
        >
          <SelectTrigger aria-label="Filter by specialty">
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
        <Select value={hospitalId} onValueChange={setHospitalId}>
          <SelectTrigger aria-label="Filter by hospital">
            <SelectValue placeholder="All hospitals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All hospitals</SelectItem>
            {(hospitals.data ?? []).map((hospital) => (
              <SelectItem key={hospital.id} value={hospital.id}>
                {hospital.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger aria-label="Filter by availability">
            <SelectValue placeholder="Any availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any availability</SelectItem>
            <SelectItem value="ACCEPTING">Accepting patients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {doctors.isLoading ? (
        <ListSkeleton rows={3} />
      ) : doctors.error ? (
        <ErrorState message={doctors.error} onRetry={() => doctors.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors match your filters"
          description="Try another specialty, hospital or clear the filters."
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              hospitalName={hospitalName(doctor.hospitalId)}
              action={
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  asChild
                >
                  <Link to={`/patient/doctors/${doctor.id}`}>View profile</Link>
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
