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

export type HospitalApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Legacy triage urgency used by the older AI recommendation record. */
export type UrgencyLevel = "LOW" | "MODERATE" | "HIGH" | "EMERGENCY";

/** Care urgency returned by the AI Health Assistant. */
export const CARE_URGENCIES = [
  "EMERGENCY",
  "URGENT",
  "ROUTINE",
  "INFORMATIONAL",
] as const;
export type CareUrgency = (typeof CARE_URGENCIES)[number];

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
  createdAt: string;
}

/**
 * Patient health profile.
 *
 * These fields are the patient-supplied context the AI Health Assistant is
 * allowed to send to the backend. Anything absent stays absent — the frontend
 * never invents a value for a missing measurement.
 */
export interface PatientHealthContext {
  age?: number;
  weightKg?: number;
  heightCm?: number;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
}

export interface Patient extends User {
  role: "PATIENT";
  dateOfBirth?: string;
  gender?: Gender;
  bloodType?: string;
  address?: string;
  emergencyContact?: string;
  /** Health profile used for AI context and the dashboard summary. */
  weightKg?: number;
  heightCm?: number;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  medicalNotes?: string;
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
  /** Visit, lab result, imaging, prescription … (demo label only). */
  recordType?: string;
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
/*                          AI health assistant                               */
/* -------------------------------------------------------------------------- */

export type AIChatRole = "PATIENT" | "ASSISTANT";

/** An image attached to a conversation message. */
export interface AIChatAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /**
   * Short-lived preview URL issued by the upload endpoint. Empty when the
   * image is no longer available (for example after a page reload).
   */
  previewUrl: string;
}

export interface AIChatMessage {
  id: string;
  conversationId: string;
  role: AIChatRole;
  content: string;
  attachments: AIChatAttachment[];
  urgency?: CareUrgency;
  followUpQuestions?: string[];
  recommendations?: string[];
  disclaimer?: string;
  recommendedDoctorIds?: string[];
  recommendedHospitalIds?: string[];
  /** True when produced by the local demo rules instead of a real AI model. */
  isMock: boolean;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  patientId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AIChatMessage[];
}

/** Conceptual request contract shared with the backend / AI owner. */
export interface AIHealthRequest {
  conversationId?: string;
  patientId: string;
  message: string;
  patientContext: PatientHealthContext;
  imageIds?: string[];
  /** Preferred reply language; "auto" follows the language of the message. */
  language?: "auto" | "en" | "am";
}

export interface AIHealthResponse {
  conversationId: string;
  message: string;
  urgency?: CareUrgency;
  followUpQuestions?: string[];
  recommendations?: string[];
  disclaimer?: string;
  recommendedDoctorIds?: string[];
  recommendedHospitalIds?: string[];
  /** True when the reply came from the local demo rules. */
  isMock: boolean;
}

/** Result of an approved image upload (bytes never reach the AI vendor). */
export interface UploadedImage {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string;
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
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: Role;
  description: string;
}
