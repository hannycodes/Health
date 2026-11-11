/**
 * Shared domain contracts for MyHealth.
 *
 * Every frontend developer imports these types from `@/types`.
 * Keep them in sync with API_CONTRACT.md — changes here ripple across all
 * five roles, so treat them as a shared interface and coordinate in the
 * integration-lead-owned PR before changing a field name.
 */

/* -------------------------------------------------------------------------- */
/*                               Enumerations                                  */
/* -------------------------------------------------------------------------- */

export const ROLES = ["PATIENT", "DOCTOR", "HOSPITAL_ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const APPOINTMENT_STATUSES = ["BOOKED", "CANCELLED", "COMPLETED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "UNPAID_AT_HOSPITAL",
  "PENDING",
  "PAID",
  "FAILED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["ONLINE", "PAY_AT_HOSPITAL"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "General Medicine",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export const HOSPITAL_APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;
export type HospitalApprovalStatus = (typeof HOSPITAL_APPROVAL_STATUSES)[number];

export const HOSPITAL_TYPES = ["GENERAL", "SPECIALTY", "REFERRAL", "CLINIC"] as const;
export type HospitalType = (typeof HOSPITAL_TYPES)[number];

/** Platform account lifecycle. `status` is optional so existing profiles stay valid. */
export const ACCOUNT_STATUSES = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "DISABLED",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type UrgencyLevel = "LOW" | "MODERATE" | "HIGH" | "EMERGENCY";

export type NotificationType =
  | "APPOINTMENT"
  | "PAYMENT"
  | "SYSTEM"
  | "APPROVAL";

export type Gender = "MALE" | "FEMALE" | "OTHER";

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  /** Defaults to ACTIVE when the backend has not supplied a status yet. */
  status?: AccountStatus;
  createdAt: string;
}

/** A platform user joined with the hospital association used by the admin portal. */
export interface PlatformUser extends User {
  hospitalId?: string;
  hospitalName?: string;
}

export interface Patient extends User {
  role: "PATIENT";
  dateOfBirth?: string;
  gender?: Gender;
  bloodType?: string;
  address?: string;
  emergencyContact?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
}

export interface Doctor extends User {
  role: "DOCTOR";
  hospitalId: string;
  specialty: Specialty;
  licenseNumber: string;
  yearsExperience: number;
  bio: string;
  consultationFee: number;
  rating: number;
  isAcceptingPatients: boolean;
}

export interface HospitalAdmin extends User {
  role: "HOSPITAL_ADMIN";
  hospitalId: string;
}

/** Administrator joined with the hospital name needed by the admin portal. */
export interface HospitalAdminWithHospital extends HospitalAdmin {
  hospitalName: string;
}

export interface SuperAdmin extends User {
  role: "SUPER_ADMIN";
}

/* -------------------------------------------------------------------------- */
/*                                 Hospital                                   */
/* -------------------------------------------------------------------------- */

export interface HospitalCapacity {
  totalBeds: number;
  occupiedBeds: number;
  totalDoctors: number;
  icuBeds: number;
  occupiedIcuBeds: number;
}

export type HospitalDocumentType =
  | "LICENSE"
  | "ACCREDITATION"
  | "TAX_CERTIFICATE"
  | "OTHER";

/**
 * Metadata for a verification document. Deliberately carries no public URL:
 * private documents are served through an authenticated backend endpoint.
 */
export interface HospitalDocument {
  id: string;
  name: string;
  type: HospitalDocumentType;
  uploadedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  specialties: Specialty[];
  rating: number;
  isVerified: boolean;
  approvalStatus: HospitalApprovalStatus;
  capacity: HospitalCapacity;
  createdAt: string;

  /* Platform application fields (optional until the backend contract lands). */
  region?: string;
  website?: string;
  hospitalType?: HospitalType;
  representativeName?: string;
  representativeEmail?: string;
  representativePhone?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  documents?: HospitalDocument[];
}

/* -------------------------------------------------------------------------- */
/*                                Appointment                                 */
/* -------------------------------------------------------------------------- */

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  /** ISO calendar date, e.g. "2026-11-20". */
  date: string;
  /** 24h clock, e.g. "09:30". */
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  paymentMethod: PaymentMethod;
}

export interface AppointmentFilter {
  patientId?: string;
  doctorId?: string;
  hospitalId?: string;
  status?: AppointmentStatus;
  date?: string;
}

/** Appointment joined with the display data every dashboard needs. */
export interface AppointmentWithDetails extends Appointment {
  patientName: string;
  doctorName: string;
  doctorSpecialty: Specialty;
  hospitalName: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

/* -------------------------------------------------------------------------- */
/*                               Medical record                               */
/* -------------------------------------------------------------------------- */

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  appointmentId?: string;
  diagnosis: string;
  treatment: string;
  prescription: string[];
  notes: string;
  recordedAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Payment                                   */
/* -------------------------------------------------------------------------- */

export interface Payment {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: "ETB";
  method: PaymentMethod;
  /** Payment lifecycle is independent of the appointment lifecycle. */
  status: PaymentStatus;
  transactionRef?: string;
  createdAt: string;
  paidAt?: string;
}

/* -------------------------------------------------------------------------- */
/*                              AI navigator                                  */
/* -------------------------------------------------------------------------- */

export interface AIRecommendation {
  id: string;
  patientId: string;
  symptoms: string;
  symptomsSummary: string;
  recommendedSpecialty: Specialty;
  urgency: UrgencyLevel;
  advice: string;
  recommendedDoctorIds: string[];
  recommendedHospitalIds: string[];
  createdAt: string;
}

export interface AITriageInput {
  patientId: string;
  symptoms: string;
  durationDays?: number;
  age?: number;
}

/* -------------------------------------------------------------------------- */
/*                              Availability                                  */
/* -------------------------------------------------------------------------- */

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  hospitalId: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/*                               Notification                                 */
/* -------------------------------------------------------------------------- */

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  /** Optional in-app route the notification points to. */
  link?: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Session                                   */
/* -------------------------------------------------------------------------- */

export interface AuthSession {
  user: User;
  hospitalId?: string;
  /** Mock-only token. The real backend will issue a JWT later. */
  token: string;
  /** ISO timestamp used to surface expired sessions in the UI. */
  expiresAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** When false the mock keeps the session in sessionStorage only. */
  remember?: boolean;
}

export interface PatientRegistrationRequest {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: Gender;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  password: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}

export interface RegistrationResponse {
  user: User;
  /** True when the backend requires e-mail verification before first login. */
  requiresVerification?: boolean;
}

export interface ForgotPasswordResponse {
  /**
   * MOCK ONLY. A real backend never returns a reset token to the browser; the
   * mock returns one so the reset screen is testable without an e-mail server.
   */
  devResetToken?: string;
}

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: Role;
  description: string;
}

/* -------------------------------------------------------------------------- */
/*                          Platform administration                           */
/* -------------------------------------------------------------------------- */

export const AUDIT_ACTIONS = [
  "HOSPITAL_REGISTERED",
  "HOSPITAL_APPROVED",
  "HOSPITAL_REJECTED",
  "HOSPITAL_SUSPENDED",
  "HOSPITAL_REACTIVATED",
  "ADMINISTRATOR_INVITED",
  "ADMINISTRATOR_REASSIGNED",
  "USER_STATUS_CHANGED",
  "ROLE_ASSIGNED",
  "SETTINGS_UPDATED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditResult = "SUCCESS" | "FAILED";

export type AuditEntityType = "HOSPITAL" | "USER" | "SETTINGS" | "PLATFORM";

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  description: string;
  /** Actor identity is derived server-side, never from the client form. */
  actorId: string;
  actorName: string;
  result: AuditResult;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface AuditLogFilter {
  search?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
}

export interface PlatformSettings {
  platformName: string;
  platformDescription: string;
  supportEmail: string;
  supportPhone: string;
  patientRegistrationEnabled: boolean;
  hospitalRegistrationEnabled: boolean;
  requireHospitalVerificationDocuments: boolean;
  regions: string[];
  hospitalTypes: HospitalType[];
  specialties: Specialty[];
  sessionTimeoutMinutes: number;
  requireStrongPasswords: boolean;
  adminSessionNote: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PlatformUserFilter {
  role?: Role;
  status?: AccountStatus;
  search?: string;
  hospitalId?: string;
}

export interface AdministratorInvitation {
  fullName: string;
  email: string;
  phone?: string;
  hospitalId: string;
}

export interface InvitationResult {
  administrator: HospitalAdmin;
  /** MOCK ONLY: a real backend e-mails the invitation instead of returning it. */
  temporaryPassword?: string;
}

export type AnalyticsRange = "7d" | "30d" | "90d" | "custom";

export interface AnalyticsFilter {
  range: AnalyticsRange;
  from?: string;
  to?: string;
}

export interface PlatformSummary {
  totalHospitals: number;
  approvedHospitals: number;
  pendingHospitals: number;
  rejectedHospitals: number;
  suspendedHospitals: number;
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAdministrators: number;
  totalSuperAdmins: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  upcomingAppointments: number;
}

export interface GrowthPoint {
  label: string;
  hospitals: number;
  approvedHospitals: number;
  patients: number;
  doctors: number;
  administrators: number;
  appointments: number;
}
