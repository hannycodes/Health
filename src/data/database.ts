import type {
  AIRecommendation,
  Appointment,
  Department,
  Doctor,
  DoctorAvailability,
  Hospital,
  HospitalAdmin,
  MedicalRecord,
  Notification,
  Patient,
  Payment,
  SuperAdmin,
} from "@/types";

/**
 * Shape of the in-browser demo database.
 *
 * This is the single source of truth for the mock environment. Every mock
 * service reads and writes through the same store, which is why a patient's
 * new appointment is immediately visible to the doctor and hospital admin
 * dashboards.
 */
export interface DemoDatabase {
  patients: Patient[];
  doctors: Doctor[];
  hospitalAdmins: HospitalAdmin[];
  superAdmins: SuperAdmin[];
  hospitals: Hospital[];
  departments: Department[];
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  payments: Payment[];
  availability: DoctorAvailability[];
  notifications: Notification[];
  recommendations: AIRecommendation[];
}
