import type {
  AIRecommendation,
  AITriageInput,
  AccountStatus,
  AdministratorInvitation,
  AnalyticsFilter,
  Appointment,
  AppointmentFilter,
  AppointmentStatus,
  AppointmentWithDetails,
  AuditLog,
  AuditLogFilter,
  AuthSession,
  CreateAppointmentInput,
  Doctor,
  DoctorAvailability,
  ForgotPasswordResponse,
  GrowthPoint,
  Hospital,
  HospitalAdminWithHospital,
  HospitalApprovalStatus,
  HospitalCapacity,
  InvitationResult,
  LoginCredentials,
  MedicalRecord,
  Notification,
  Patient,
  PatientRegistrationRequest,
  Payment,
  PlatformSettings,
  PlatformSummary,
  PlatformUser,
  PlatformUserFilter,
  RegistrationResponse,
  Specialty,
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
  registerPatient(
    data: PatientRegistrationRequest,
  ): Promise<RegistrationResponse>;
  logout(): Promise<void>;
  /** Synchronous session read for the auth provider's initial render. */
  getSession(): AuthSession | null;
  getCurrentUser(): Promise<User | null>;
  forgotPassword(email: string): Promise<ForgotPasswordResponse>;
  resetPassword(token: string, newPassword: string): Promise<void>;
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
  /** Approval workflow actions; each is audited by the backend. */
  approve(id: string): Promise<Hospital>;
  reject(id: string, reason: string): Promise<Hospital>;
  suspend(id: string, reason: string): Promise<Hospital>;
  reactivate(id: string): Promise<Hospital>;
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

export interface NotificationService {
  listForUser(userId: string): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}

/* -------------------------------------------------------------------------- */
/*                          Platform administration                           */
/* -------------------------------------------------------------------------- */

export interface UserService {
  /** Platform accounts joined with their hospital association. */
  list(filter?: PlatformUserFilter): Promise<PlatformUser[]>;
  getById(id: string): Promise<PlatformUser | null>;
  setStatus(
    id: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<PlatformUser>;
}

export interface AdministratorFilter {
  search?: string;
  status?: AccountStatus;
  hospitalId?: string;
}

export interface AdminService {
  list(filter?: AdministratorFilter): Promise<HospitalAdminWithHospital[]>;
  getById(id: string): Promise<HospitalAdminWithHospital | null>;
  invite(input: AdministratorInvitation): Promise<InvitationResult>;
  reassign(
    id: string,
    hospitalId: string,
  ): Promise<HospitalAdminWithHospital>;
  setStatus(
    id: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<HospitalAdminWithHospital>;
}

export interface AuditLogService {
  list(filter?: AuditLogFilter): Promise<AuditLog[]>;
}

export interface AnalyticsService {
  getSummary(): Promise<PlatformSummary>;
  getGrowth(filter: AnalyticsFilter): Promise<GrowthPoint[]>;
}

export interface SettingsService {
  get(): Promise<PlatformSettings>;
  update(patch: Partial<PlatformSettings>): Promise<PlatformSettings>;
}

export interface ServiceContainer {
  auth: AuthService;
  users: UserService;
  administrators: AdminService;
  auditLogs: AuditLogService;
  analytics: AnalyticsService;
  settings: SettingsService;
  patients: PatientService;
  doctors: DoctorService;
  hospitals: HospitalService;
  appointments: AppointmentService;
  medicalRecords: MedicalRecordService;
  payments: PaymentService;
  aiNavigator: AINavigatorService;
  notifications: NotificationService;
}
