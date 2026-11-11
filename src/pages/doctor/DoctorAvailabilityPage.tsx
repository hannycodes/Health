import { AvailabilityEditor } from "@/components/doctor/AvailabilityEditor";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function DoctorAvailabilityPage() {
  const { doctorId, doctor, isLoading, error, refetch } = useDoctorWorkspace();
  const slots = useServiceQuery(
    () => (doctorId ? services.doctors.listAvailability(doctorId) : Promise.resolve([])),
    doctorId,
  );

  const refetchSlots = () => {
    slots.refetch();
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="Weekly consultation hours. These slots are read by the patient booking flow through the same availability service."
        breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Availability" }]}
      />

      {isLoading || slots.isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || slots.error ? (
        <ErrorState
          message={error ?? slots.error ?? "Unable to load availability."}
          onRetry={refetchSlots}
        />
      ) : (
        <AvailabilityEditor
          doctorId={doctorId}
          hospitalId={doctor?.hospitalId ?? ""}
          slots={slots.data ?? []}
          onChanged={refetchSlots}
        />
      )}
    </div>
  );
}
