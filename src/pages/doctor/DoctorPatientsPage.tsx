import { useMemo, useState } from "react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { PatientTable } from "@/components/doctor/PatientTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { todayISO } from "@/utils/format";

type PatientFilter = "ALL" | "UPCOMING" | "RECORDS";

export function DoctorPatientsPage() {
  const { patients, appointments, records, isLoading, error, refetch } = useDoctorWorkspace();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("ALL");

  const today = todayISO();

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return patients.filter((patient) => {
      if (
        term &&
        !patient.fullName.toLowerCase().includes(term) &&
        !patient.id.includes(term)
      ) {
        return false;
      }
      if (filter === "UPCOMING") {
        const hasUpcoming = appointments.some(
          (row) =>
            row.patientId === patient.id && row.status === "BOOKED" && row.date >= today,
        );
        if (!hasUpcoming) return false;
      }
      if (filter === "RECORDS") {
        if (!records.some((record) => record.patientId === patient.id)) return false;
      }
      return true;
    });
  }, [patients, appointments, records, search, filter, today]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Patients you are authorized to access through your appointments and clinical records."
        breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Patients" }]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as PatientFilter)}>
          <TabsList aria-label="Filter patients">
            <TabsTrigger value="ALL">All ({patients.length})</TabsTrigger>
            <TabsTrigger value="UPCOMING">With upcoming</TabsTrigger>
            <TabsTrigger value="RECORDS">With records</TabsTrigger>
          </TabsList>
        </Tabs>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or patient ID"
          ariaLabel="Search authorized patients"
        />
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <PatientTable patients={visible} appointments={appointments} />
      )}
    </div>
  );
}
