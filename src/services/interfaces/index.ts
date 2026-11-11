import type {
  AIConversation,
  AIHealthRequest,
  AIHealthResponse,
  AIRecommendation,
  AITriageInput,
  Appointment,
  AppointmentFilter,
  AppointmentStatus,
  AppointmentWithDetails,
  AuthSession,
  CreateAppointmentInput,
  Doctor,
  DoctorAvailability,
  Hospital,
  HospitalApprovalStatus,
  HospitalCapacity,
  LoginCredentials,
  MedicalRecord,
  Notification,
  Patient,
  Payment,
  Specialty,
  UploadedImage,
  User,
} from "@/types";

/**
 * Service contracts.
 *
 * UI code imports these interfaces (through the container in
 * `src/services/index.ts`) and never touches mock data directly. That keeps
 * every dashboard swappable to the real API without touching components.
 */

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
  /** Synchronous session read for the auth provider's initial render. */
  getSession(): AuthSession | null;
  getCurrentUser(): Promise<User | null>;
}

export interface PatientService {
  list(): Promise<Patient[]>;
  getById(id: string): Promise<Patient | null>;
  getByUserId(userId: string): Promise<Patient | null>;
  update(
    id: string,
    patch: Partial<
      Pick<
        Patient,
        | "fullName"
        | "phone"
        | "address"
        | "emergencyContact"
        | "bloodType"
        | "dateOfBirth"
        | "gender"
        | "weightKg"
        | "heightCm"
        | "allergies"
        | "conditions"
        | "medications"
        | "medicalNotes"
      >
    >,
  ): Promise<Patient>;
}

export interface DoctorFilter {
  hospitalId?: string;
  specialty?: Specialty;
  search?: string;
  acceptingOnly?: boolean;
}

export interface DoctorService {
  list(filter?: DoctorFilter): Promise<Doctor[]>;
  getById(id: string): Promise<Doctor | null>;
  getByUserId(userId: string): Promise<Doctor | null>;
  update(id: string, patch: Partial<Doctor>): Promise<Doctor>;
  listAvailability(doctorId: string): Promise<DoctorAvailability[]>;
  saveAvailability(
    input: Omit<DoctorAvailability, "id"> & { id?: string },
  ): Promise<DoctorAvailability>;
  removeAvailability(id: string): Promise<void>;
}

export interface HospitalFilter {
  approvalStatus?: HospitalApprovalStatus;
  city?: string;
  search?: string;
}

export interface HospitalService {
  list(filter?: HospitalFilter): Promise<Hospital[]>;
  getById(id: string): Promise<Hospital | null>;
  update(id: string, patch: Partial<Hospital>): Promise<Hospital>;
  listPendingApprovals(): Promise<Hospital[]>;
  setApprovalStatus(
    id: string,
    status: HospitalApprovalStatus,
  ): Promise<Hospital>;
  updateCapacity(
    id: string,
    patch: Partial<HospitalCapacity>,
  ): Promise<Hospital>;
}

export interface AppointmentService {
  list(filter?: AppointmentFilter): Promise<Appointment[]>;
  /** Appointments joined with patient, doctor, hospital and payment data. */
  listDetailed(filter?: AppointmentFilter): Promise<AppointmentWithDetails[]>;
  getById(id: string): Promise<Appointment | null>;
  create(input: CreateAppointmentInput): Promise<Appointment>;
  updateStatus(id: string, status: AppointmentStatus): Promise<Appointment>;
  cancel(id: string): Promise<Appointment>;
  complete(id: string): Promise<Appointment>;
  reschedule(
    id: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<Appointment>;
}

export interface MedicalRecordService {
  listByPatient(patientId: string): Promise<MedicalRecord[]>;
  listByDoctor(doctorId: string): Promise<MedicalRecord[]>;
  getById(id: string): Promise<MedicalRecord | null>;
  create(input: Omit<MedicalRecord, "id" | "recordedAt">): Promise<MedicalRecord>;
}

export interface PaymentService {
  listByPatient(patientId: string): Promise<Payment[]>;
  listByHospital(hospitalId: string): Promise<Payment[]>;
  getByAppointment(appointmentId: string): Promise<Payment | null>;
  payOnline(appointmentId: string): Promise<Payment>;
  markPaidAtHospital(appointmentId: string): Promise<Payment>;
  markFailed(appointmentId: string): Promise<Payment>;
}

export interface AINavigatorService {
  analyze(input: AITriageInput): Promise<AIRecommendation>;
  listByPatient(patientId: string): Promise<AIRecommendation[]>;
}

/**
 * AI Health Assistant contract.
 *
 * The browser talks to the MyHealth backend only: image bytes go to the
 * upload endpoint and the model call happens server-side, so no provider key
 * ever ships in the bundle.
 */
export interface AIHealthService {
  listConversations(patientId: string): Promise<AIConversation[]>;
  getConversation(conversationId: string): Promise<AIConversation | null>;
  startConversation(patientId: string): Promise<AIConversation>;
  /** Upload an approved image and receive a short-lived reference. */
  uploadImage(file: File): Promise<UploadedImage>;
  sendMessage(input: AIHealthRequest): Promise<AIHealthResponse>;
}

export interface NotificationService {
  listForUser(userId: string): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}

export interface ServiceContainer {
  auth: AuthService;
  patients: PatientService;
  doctors: DoctorService;
  hospitals: HospitalService;
  appointments: AppointmentService;
  medicalRecords: MedicalRecordService;
  payments: PaymentService;
  aiNavigator: AINavigatorService;
  aiHealth: AIHealthService;
  notifications: NotificationService;
}
