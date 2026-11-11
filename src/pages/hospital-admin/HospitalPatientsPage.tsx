import { useState } from "react";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { PatientTable } from "@/components/hospital/PatientTable";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";
import { buildPatientRows } from "./selectors";

export function HospitalPatientsPage() {
  const { hospitalId = "" } = useAuth();
  const [search, setSearch] = useState("");

  const patients = useServiceQuery(() => services.patients.list(), "patients");
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ hospitalId }),
    `appointments:${hospitalId}`,
  );

  const rows = buildPatientRows(appointments.data ?? [], patients.data ?? []).filter(
    (row) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        row.patient.fullName.toLowerCase().includes(term) ||
        row.patient.email.toLowerCase().includes(term) ||
        row.patient.id.toLowerCase().includes(term)
      );
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Patients with appointments at your hospital. Clinical records remain restricted to treating doctors."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Patients" },
        ]}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email or patient ID"
        ariaLabel="Search hospital patients"
      />

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : appointments.isLoading || patients.isLoading ? (
        <ListSkeleton rows={3} />
      ) : appointments.error ? (
        <ErrorState message={appointments.error} onRetry={appointments.refetch} />
      ) : (
        <PatientTable rows={rows} />
      )}
    </div>
  );
}
