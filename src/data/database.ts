import type {
  AIRecommendation,
  Appointment,
  AuditLog,
  Doctor,
  DoctorAvailability,
  Hospital,
  HospitalAdmin,
  MedicalRecord,
  Notification,
  Patient,
  Payment,
  PlatformSettings,
  SuperAdmin,
} from "@/types";

/** MOCK ONLY — demo credentials. A real backend stores salted password hashes. */
export interface DemoCredential {
  userId: string;
  email: string;
  password: string;
}

/** MOCK ONLY — short-lived password reset requests. */
export interface PasswordReset {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

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
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  payments: Payment[];
  availability: DoctorAvailability[];
  notifications: Notification[];
  recommendations: AIRecommendation[];
  credentials: DemoCredential[];
  passwordResets: PasswordReset[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
}
