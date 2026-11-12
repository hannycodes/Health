import { useServiceQuery } from "@/hooks/useServiceQuery";
import { useAuth } from "@/hooks/useAuth";
import { services } from "@/services";
import type { AppointmentWithDetails, Doctor, MedicalRecord, Patient } from "@/types";
import { listAuthorizedPatients } from "../services/doctorAccess";

/**
 * One loader for everything the Doctor Portal shows about the signed-in
 * doctor. Patient access is scoped through `listAuthorizedPatients`, so the
 * portal never reads the whole patient table.
 */
export function useDoctorWorkspace() {
  const { user } = useAuth();
  const doctorId = user?.role === "DOCTOR" ? user.id : "";

  const profile = useServiceQuery<Doctor | null>(
    () => (doctorId ? services.doctors.getById(doctorId) : Promise.resolve(null)),
    doctorId,
  );

  const patients = useServiceQuery<Patient[]>(
    () => (doctorId ? listAuthorizedPatients(doctorId) : Promise.resolve([])),
    doctorId,
  );

  const appointments = useServiceQuery<AppointmentWithDetails[]>(
    () =>
      doctorId
        ? services.appointments.listDetailed({ doctorId })
        : Promise.resolve<AppointmentWithDetails[]>([]),
    doctorId,
  );

  const records = useServiceQuery<MedicalRecord[]>(
    () =>
      doctorId
        ? services.medicalRecords.listByDoctor(doctorId)
        : Promise.resolve<MedicalRecord[]>([]),
    doctorId,
  );

  const refetch = () => {
    profile.refetch();
    patients.refetch();
    appointments.refetch();
    records.refetch();
  };

  return {
    doctorId,
    doctor: profile.data,
    patients: patients.data ?? [],
    appointments: appointments.data ?? [],
    records: records.data ?? [],
    isLoading:
      profile.isLoading || patients.isLoading || appointments.isLoading || records.isLoading,
    error: profile.error ?? patients.error ?? appointments.error ?? records.error,
    refetch,
  };
}
