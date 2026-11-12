import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import {
  MedicalRecordForm,
  type MedicalRecordValues,
} from "@/components/doctor/MedicalRecordForm";
import { Button } from "@/components/ui/button";
import { getAuthorizedPatient } from "@/features/doctor/services/doctorAccess";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { useState } from "react";

export function NewMedicalRecordPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorId = user?.id ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appointmentId = searchParams.get("appointmentId") ?? undefined;

  const patient = useServiceQuery(
    () => getAuthorizedPatient(doctorId, id),
    `${doctorId}:${id}`,
  );
  const doctor = useServiceQuery(
    () => (doctorId ? services.doctors.getById(doctorId) : Promise.resolve(null)),
    doctorId,
  );
  const hospital = useServiceQuery(
    () =>
      doctor.data ? services.hospitals.getById(doctor.data.hospitalId) : Promise.resolve(null),
    doctor.data?.hospitalId ?? "",
  );
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ doctorId, patientId: id }),
    `${doctorId}:${id}`,
  );

  async function handleSubmit(values: MedicalRecordValues) {
    if (!patient.data || !doctor.data) return;

    setIsSubmitting(true);
    try {
      const record = await services.medicalRecords.create({
        patientId: patient.data.id,
        doctorId: doctor.data.id,
        hospitalId: doctor.data.hospitalId,
        appointmentId:
          values.appointmentId && values.appointmentId !== "none"
            ? values.appointmentId
            : undefined,
        diagnosis: values.diagnosis.trim(),
        treatment: values.treatment.trim(),
        prescription: values.prescription
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        notes: values.notes.trim(),
      });

      toast.success("Clinical record saved.");
      navigate(`/doctor/patients/${patient.data.id}/records/${record.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (patient.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="New clinical record" description="Loading patient…" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (patient.error || !patient.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="New clinical record"
          breadcrumbs={[
            { label: "Doctor", to: "/doctor" },
            { label: "Patients", to: "/doctor/patients" },
            { label: "New record" },
          ]}
        />
        {patient.error ? (
          <ErrorState message={patient.error} onRetry={patient.refetch} />
        ) : (
          <EmptyState
            title="Patient not available"
            description="You do not have an active care relationship with this patient."
            action={
              <Button asChild>
                <a href="/doctor/patients">Back to patients</a>
              </Button>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New clinical record"
        description={`Record a consultation for ${patient.data.fullName}. Records are saved against your account and are never overwritten.`}
        breadcrumbs={[
          { label: "Doctor", to: "/doctor" },
          { label: "Patients", to: "/doctor/patients" },
          { label: patient.data.fullName, to: `/doctor/patients/${patient.data.id}` },
          { label: "New record" },
        ]}
      />

      <MedicalRecordForm
        patient={patient.data}
        doctorId={doctorId}
        hospitalId={doctor.data?.hospitalId ?? ""}
        doctorName={doctor.data?.fullName ?? "You"}
        hospitalName={hospital.data?.name ?? "Your hospital"}
        appointments={appointments.data ?? []}
        defaultAppointmentId={appointmentId}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/doctor/patients/${patient.data?.id ?? ""}`)}
      />
    </div>
  );
}
