import { toast } from "sonner";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { DoctorProfileForm, type DoctorProfileValues } from "@/components/doctor/DoctorProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { useState } from "react";

export function DoctorProfilePage() {
  const { doctorId, doctor, isLoading, error, refetch } = useDoctorWorkspace();
  const hospital = useServiceQuery(
    () =>
      doctor ? services.hospitals.getById(doctor.hospitalId) : Promise.resolve(null),
    doctor?.hospitalId ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: DoctorProfileValues) {
    if (!doctorId) return;
    setIsSubmitting(true);
    try {
      await services.doctors.update(doctorId, values);
      toast.success("Profile updated.");
      refetch();
    } catch (updateError) {
      toast.error(getApiErrorMessage(updateError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your professional information as patients see it. License and rating are managed by the platform."
        breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "Profile" }]}
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !doctor ? (
        <ErrorState
          title="Profile unavailable"
          message="Your doctor profile could not be loaded from the shared service."
          onRetry={refetch}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <DoctorProfileForm
            doctor={doctor}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hospital affiliation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{hospital.data?.name ?? "Not available"}</p>
                <p className="text-muted-foreground text-xs">
                  {hospital.data
                    ? `${hospital.data.city} · ${hospital.data.address}`
                    : "Hospital information is read from the shared hospital service."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p>
                  <span className="text-muted-foreground">License number: </span>
                  {doctor.licenseNumber}
                </p>
                <p>
                  <span className="text-muted-foreground">Rating: </span>
                  {doctor.rating.toFixed(1)}
                </p>
                <p className="text-muted-foreground">
                  Credentials are read-only. Professional credentials are not invented or
                  editable from the Doctor Portal.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
