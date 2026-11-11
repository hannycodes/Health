import { useState } from "react";
import { Stethoscope } from "lucide-react";

import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
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
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { SPECIALTIES, type Specialty } from "@/types";

type SpecialtyFilter = Specialty | "ALL";

export function PatientDoctors() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<SpecialtyFilter>("ALL");

  const doctors = useServiceQuery(
    () =>
      services.doctors.list({
        search,
        specialty: specialty === "ALL" ? undefined : specialty,
      }),
    `${search}:${specialty}`,
  );
  const hospitals = useServiceQuery(() => services.hospitals.list(), "hospitals");

  const hospitalName = (hospitalId: string) =>
    hospitals.data?.find((hospital) => hospital.id === hospitalId)?.name;

  const rows = doctors.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a doctor"
        description="Filter by specialty, compare experience and book directly."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "Doctors" }]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by doctor name"
          ariaLabel="Search doctors"
        />
        <Select
          value={specialty}
          onValueChange={(value) => setSpecialty(value as SpecialtyFilter)}
        >
          <SelectTrigger className="sm:w-56" aria-label="Filter by specialty">
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
      </div>

      {doctors.isLoading ? (
        <ListSkeleton rows={3} />
      ) : doctors.error ? (
        <ErrorState message={doctors.error} onRetry={() => doctors.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors match your filters"
          description="Try another specialty or clear the search."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              hospitalName={hospitalName(doctor.hospitalId)}
              action={
                user ? (
                  <BookAppointmentDialog
                    patientId={user.id}
                    trigger={
                      <Button size="sm" className="w-full">
                        Book appointment
                      </Button>
                    }
                  />
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
