import { ApiError } from "@/lib/http";
import { services } from "@/services";
import type { AppointmentWithDetails, MedicalRecord, Patient } from "@/types";

/**
 * Doctor-scoped patient authorization.
 *
 * The backend is the real security boundary. This helper exists so the Doctor
 * Portal never *shows* a patient the signed-in doctor has no care relationship
 * with: access is derived from appointments with that doctor or records the
 * doctor authored, never from the full patient list.
 */
export async function listAuthorizedPatientIds(doctorId: string): Promise<string[]> {
  if (!doctorId) return [];

  const [appointments, records] = await Promise.all([
    services.appointments.list({ doctorId }),
    services.medicalRecords.listByDoctor(doctorId),
  ]);

  return Array.from(
    new Set([
      ...appointments.map((appointment) => appointment.patientId),
      ...records.map((record) => record.patientId),
    ]),
  );
}

export async function listAuthorizedPatients(doctorId: string): Promise<Patient[]> {
  const ids = await listAuthorizedPatientIds(doctorId);
  if (ids.length === 0) return [];

  const allowed = new Set(ids);
  const patients = await services.patients.list();
  return patients.filter((patient) => allowed.has(patient.id));
}

/**
 * Resolve a single patient for the doctor, or throw the same 403 the backend
 * would return so the UI can show an honest access-denied state.
 */
export async function getAuthorizedPatient(
  doctorId: string,
  patientId: string,
): Promise<Patient> {
  const ids = await listAuthorizedPatientIds(doctorId);
  if (!ids.includes(patientId)) {
    throw new ApiError({
      status: 403,
      message: "You do not have an active care relationship with this patient.",
    });
  }

  const patient = await services.patients.getById(patientId);
  if (!patient) {
    throw new ApiError({ status: 404, message: "Patient profile not found." });
  }
  return patient;
}

export async function isAuthorizedForPatient(doctorId: string, patientId: string) {
  if (!doctorId || !patientId) return false;
  const ids = await listAuthorizedPatientIds(doctorId);
  return ids.includes(patientId);
}

/**
 * Records for one authorized patient. Returns an empty list (rather than
 * throwing) when the patient is outside the doctor's care relationships so
 * history pages fail closed without leaking existence.
 */
export async function listAuthorizedRecords(
  doctorId: string,
  patientId: string,
): Promise<MedicalRecord[]> {
  const allowed = await isAuthorizedForPatient(doctorId, patientId);
  if (!allowed) return [];
  return services.medicalRecords.listByPatient(patientId);
}

export async function listAuthorizedAppointments(
  doctorId: string,
  filter: { patientId?: string } = {},
): Promise<AppointmentWithDetails[]> {
  const rows = await services.appointments.listDetailed({ doctorId });
  if (!filter.patientId) return rows;
  return rows.filter((row) => row.patientId === filter.patientId);
}
