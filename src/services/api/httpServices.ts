import type {
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
  CreateDepartmentInput,
  CreateDoctorInput,
  Department,
  DepartmentStatus,
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
  User,
} from "@/types";
import type {
  AINavigatorService,
  AdminService,
  AdministratorFilter,
  AnalyticsService,
  AppointmentService,
  AuditLogService,
  AuthService,
  DepartmentFilter,
  DepartmentService,
  DoctorFilter,
  DoctorService,
  HospitalFilter,
  HospitalService,
  MedicalRecordService,
  NotificationService,
  PatientService,
  PaymentService,
  ServiceContainer,
  SettingsService,
  UserService,
} from "@/services/interfaces";
import { clearSession, readSession, writeSession } from "@/lib/session";
import { httpClient } from "@/lib/http";

/**
 * HTTP adapters.
 *
 * Auth and platform administration call the API in `server/` (proxied at
 * `/api` by Vite in development). Set `VITE_API_BASE_URL` to target a
 * deployed backend.
 */

class HttpAuthService implements AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { remember = true, ...body } = credentials;
    const { data } = await httpClient.post<AuthSession>("/auth/login", {
      ...body,
      remember,
    });
    writeSession(data, remember);
    return data;
  }

  async registerPatient(
    body: PatientRegistrationRequest,
  ): Promise<RegistrationResponse> {
    const { data } = await httpClient.post<RegistrationResponse>(
      "/auth/register",
      body,
    );
    return data;
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    // The real backend always answers generically and never returns a token.
    await httpClient.post("/auth/forgot-password", { email });
    return {};
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await httpClient.post("/auth/reset-password", { token, newPassword });
  }

  async logout(): Promise<void> {
    try {
      await httpClient.post("/auth/logout");
    } finally {
      clearSession();
    }
  }

  getSession(): AuthSession | null {
    return readSession();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data } = await httpClient.get<User>("/auth/me");
    return data;
  }
}

class HttpPatientService implements PatientService {
  async list(): Promise<Patient[]> {
    const { data } = await httpClient.get<Patient[]>("/patients");
    return data;
  }

  async getById(id: string): Promise<Patient | null> {
    const { data } = await httpClient.get<Patient>(`/patients/${id}`);
    return data;
  }

  async getByUserId(userId: string): Promise<Patient | null> {
    const { data } = await httpClient.get<Patient>(`/patients/me`, {
      params: { userId },
    });
    return data;
  }

  async update(id: string, patch: Partial<Patient>): Promise<Patient> {
    const { data } = await httpClient.patch<Patient>(`/patients/${id}`, patch);
    return data;
  }
}

class HttpDoctorService implements DoctorService {
  async list(filter?: DoctorFilter): Promise<Doctor[]> {
    const { data } = await httpClient.get<Doctor[]>("/doctors", { params: filter });
    return data;
  }

  async getById(id: string): Promise<Doctor | null> {
    const { data } = await httpClient.get<Doctor>(`/doctors/${id}`);
    return data;
  }

  async getByUserId(userId: string): Promise<Doctor | null> {
    const { data } = await httpClient.get<Doctor>("/doctors/me", {
      params: { userId },
    });
    return data;
  }

  async create(input: CreateDoctorInput): Promise<Doctor> {
    const { data } = await httpClient.post<Doctor>("/doctors", input);
    return data;
  }

  async update(id: string, patch: Partial<Doctor>): Promise<Doctor> {
    const { data } = await httpClient.patch<Doctor>(`/doctors/${id}`, patch);
    return data;
  }

  async setActive(id: string, active: boolean): Promise<Doctor> {
    const { data } = await httpClient.patch<Doctor>(`/doctors/${id}/activation`, {
      active,
    });
    return data;
  }

  async listAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    const { data } = await httpClient.get<DoctorAvailability[]>(
      `/doctors/${doctorId}/availability`,
    );
    return data;
  }

  async saveAvailability(
    input: Omit<DoctorAvailability, "id"> & { id?: string },
  ): Promise<DoctorAvailability> {
    const { id, ...body } = input;
    const { data } = id
      ? await httpClient.patch<DoctorAvailability>(`/availability/${id}`, body)
      : await httpClient.post<DoctorAvailability>("/availability", body);
    return data;
  }

  async removeAvailability(id: string): Promise<void> {
    await httpClient.delete(`/availability/${id}`);
  }
}

class HttpHospitalService implements HospitalService {
  async list(filter?: HospitalFilter): Promise<Hospital[]> {
    const { data } = await httpClient.get<Hospital[]>("/hospitals", { params: filter });
    return data;
  }

  async getById(id: string): Promise<Hospital | null> {
    const { data } = await httpClient.get<Hospital>(`/hospitals/${id}`);
    return data;
  }

  async update(id: string, patch: Partial<Hospital>): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(`/hospitals/${id}`, patch);
    return data;
  }

  async listPendingApprovals(): Promise<Hospital[]> {
    const { data } = await httpClient.get<Hospital[]>("/hospitals", {
      params: { approvalStatus: "PENDING" },
    });
    return data;
  }

  async setApprovalStatus(
    id: string,
    status: HospitalApprovalStatus,
  ): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(`/hospitals/${id}/approval`, {
      status,
    });
    return data;
  }

  async approve(id: string): Promise<Hospital> {
    return this.setApprovalStatus(id, "APPROVED");
  }

  async reject(id: string, reason: string): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(
      `/hospitals/${id}/approval`,
      { status: "REJECTED", reason },
    );
    return data;
  }

  async suspend(id: string, reason: string): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(
      `/hospitals/${id}/approval`,
      { status: "SUSPENDED", reason },
    );
    return data;
  }

  async reactivate(id: string): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(
      `/hospitals/${id}/approval`,
      { status: "APPROVED", reactivate: true },
    );
    return data;
  }

  async updateCapacity(
    id: string,
    patch: Partial<HospitalCapacity>,
  ): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(`/hospitals/${id}/capacity`, patch);
    return data;
  }
}

class HttpDepartmentService implements DepartmentService {
  async list(filter?: DepartmentFilter): Promise<Department[]> {
    const { data } = await httpClient.get<Department[]>("/departments", {
      params: filter,
    });
    return data;
  }

  async getById(id: string): Promise<Department | null> {
    const { data } = await httpClient.get<Department>(`/departments/${id}`);
    return data;
  }

  async create(input: CreateDepartmentInput): Promise<Department> {
    const { data } = await httpClient.post<Department>("/departments", input);
    return data;
  }

  async update(id: string, patch: Partial<Department>): Promise<Department> {
    const { data } = await httpClient.patch<Department>(`/departments/${id}`, patch);
    return data;
  }

  async setStatus(id: string, status: DepartmentStatus): Promise<Department> {
    const { data } = await httpClient.patch<Department>(`/departments/${id}/status`, {
      status,
    });
    return data;
  }
}

class HttpAppointmentService implements AppointmentService {
  async list(filter?: AppointmentFilter): Promise<Appointment[]> {
    const { data } = await httpClient.get<Appointment[]>("/appointments", {
      params: filter,
    });
    return data;
  }

  async listDetailed(filter?: AppointmentFilter): Promise<AppointmentWithDetails[]> {
    const { data } = await httpClient.get<AppointmentWithDetails[]>("/appointments", {
      params: { ...filter, expand: "patient,doctor,hospital,payment" },
    });
    return data;
  }

  async getById(id: string): Promise<Appointment | null> {
    const { data } = await httpClient.get<Appointment>(`/appointments/${id}`);
    return data;
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const { data } = await httpClient.post<Appointment>("/appointments", input);
    return data;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const { data } = await httpClient.patch<Appointment>(`/appointments/${id}`, {
      status,
    });
    return data;
  }

  async cancel(id: string): Promise<Appointment> {
    const { data } = await httpClient.post<Appointment>(`/appointments/${id}/cancel`);
    return data;
  }

  async complete(id: string): Promise<Appointment> {
    const { data } = await httpClient.post<Appointment>(`/appointments/${id}/complete`);
    return data;
  }

  async reschedule(
    id: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<Appointment> {
    const { data } = await httpClient.patch<Appointment>(
      `/appointments/${id}/reschedule`,
      { date, startTime, endTime },
    );
    return data;
  }
}

class HttpMedicalRecordService implements MedicalRecordService {
  async listByPatient(patientId: string): Promise<MedicalRecord[]> {
    const { data } = await httpClient.get<MedicalRecord[]>("/medical-records", {
      params: { patientId },
    });
    return data;
  }

  async listByDoctor(doctorId: string): Promise<MedicalRecord[]> {
    const { data } = await httpClient.get<MedicalRecord[]>("/medical-records", {
      params: { doctorId },
    });
    return data;
  }

  async create(input: Omit<MedicalRecord, "id" | "recordedAt">): Promise<MedicalRecord> {
    const { data } = await httpClient.post<MedicalRecord>("/medical-records", input);
    return data;
  }
}

class HttpPaymentService implements PaymentService {
  async listByPatient(patientId: string): Promise<Payment[]> {
    const { data } = await httpClient.get<Payment[]>("/payments", {
      params: { patientId },
    });
    return data;
  }

  async listByHospital(hospitalId: string): Promise<Payment[]> {
    const { data } = await httpClient.get<Payment[]>("/payments", {
      params: { hospitalId },
    });
    return data;
  }

  async getByAppointment(appointmentId: string): Promise<Payment | null> {
    const { data } = await httpClient.get<Payment>("/payments", {
      params: { appointmentId },
    });
    return data;
  }

  async payOnline(appointmentId: string): Promise<Payment> {
    const { data } = await httpClient.post<Payment>(`/payments/${appointmentId}/pay`);
    return data;
  }

  async markPaidAtHospital(appointmentId: string): Promise<Payment> {
    const { data } = await httpClient.post<Payment>(
      `/payments/${appointmentId}/mark-paid`,
    );
    return data;
  }

  async markFailed(appointmentId: string): Promise<Payment> {
    const { data } = await httpClient.post<Payment>(
      `/payments/${appointmentId}/mark-failed`,
    );
    return data;
  }
}

class HttpAINavigatorService implements AINavigatorService {
  async analyze(input: Parameters<AINavigatorService["analyze"]>[0]) {
    const { data } = await httpClient.post("/ai/triage", input);
    return data;
  }

  async listByPatient(patientId: string) {
    const { data } = await httpClient.get("/ai/recommendations", {
      params: { patientId },
    });
    return data;
  }
}

class HttpNotificationService implements NotificationService {
  async listForUser(userId: string): Promise<Notification[]> {
    const { data } = await httpClient.get<Notification[]>("/notifications", {
      params: { userId },
    });
    return data;
  }

  async markRead(id: string): Promise<void> {
    await httpClient.post(`/notifications/${id}/read`);
  }

  async markAllRead(userId: string): Promise<void> {
    await httpClient.post("/notifications/read-all", { userId });
  }

  async unreadCount(userId: string): Promise<number> {
    const { data } = await httpClient.get<number>("/notifications/unread-count", {
      params: { userId },
    });
    return data;
  }
}

class HttpUserService implements UserService {
  async list(filter?: PlatformUserFilter): Promise<PlatformUser[]> {
    const { data } = await httpClient.get<PlatformUser[]>("/admin/users", {
      params: filter,
    });
    return data;
  }

  async getById(id: string): Promise<PlatformUser | null> {
    const { data } = await httpClient.get<PlatformUser>(`/admin/users/${id}`);
    return data;
  }

  async setStatus(
    id: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<PlatformUser> {
    const { data } = await httpClient.patch<PlatformUser>(
      `/admin/users/${id}/status`,
      { status, reason },
    );
    return data;
  }
}

class HttpAdminService implements AdminService {
  async list(filter?: AdministratorFilter): Promise<HospitalAdminWithHospital[]> {
    const { data } = await httpClient.get<HospitalAdminWithHospital[]>(
      "/admin/administrators",
      { params: filter },
    );
    return data;
  }

  async getById(id: string): Promise<HospitalAdminWithHospital | null> {
    const { data } = await httpClient.get<HospitalAdminWithHospital>(
      `/admin/administrators/${id}`,
    );
    return data;
  }

  async invite(input: AdministratorInvitation): Promise<InvitationResult> {
    const { data } = await httpClient.post<InvitationResult>(
      "/admin/administrators/invite",
      input,
    );
    return data;
  }

  async reassign(
    id: string,
    hospitalId: string,
  ): Promise<HospitalAdminWithHospital> {
    const { data } = await httpClient.patch<HospitalAdminWithHospital>(
      `/admin/administrators/${id}/hospital`,
      { hospitalId },
    );
    return data;
  }

  async setStatus(
    id: string,
    status: AccountStatus,
    reason?: string,
  ): Promise<HospitalAdminWithHospital> {
    const { data } = await httpClient.patch<HospitalAdminWithHospital>(
      `/admin/administrators/${id}/status`,
      { status, reason },
    );
    return data;
  }
}

class HttpAuditLogService implements AuditLogService {
  async list(filter?: AuditLogFilter): Promise<AuditLog[]> {
    const { data } = await httpClient.get<AuditLog[]>("/admin/audit-logs", {
      params: filter,
    });
    return data;
  }
}

class HttpAnalyticsService implements AnalyticsService {
  async getSummary(): Promise<PlatformSummary> {
    const { data } = await httpClient.get<PlatformSummary>(
      "/admin/analytics/summary",
    );
    return data;
  }

  async getGrowth(filter: AnalyticsFilter): Promise<GrowthPoint[]> {
    const { data } = await httpClient.get<GrowthPoint[]>(
      "/admin/analytics/growth",
      { params: filter },
    );
    return data;
  }
}

class HttpSettingsService implements SettingsService {
  async get(): Promise<PlatformSettings> {
    const { data } = await httpClient.get<PlatformSettings>("/admin/settings");
    return data;
  }

  async update(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const { data } = await httpClient.patch<PlatformSettings>(
      "/admin/settings",
      patch,
    );
    return data;
  }
}

export function createHttpServices(): ServiceContainer {
  return {
    auth: new HttpAuthService(),
    users: new HttpUserService(),
    administrators: new HttpAdminService(),
    auditLogs: new HttpAuditLogService(),
    analytics: new HttpAnalyticsService(),
    settings: new HttpSettingsService(),
    patients: new HttpPatientService(),
    doctors: new HttpDoctorService(),
    departments: new HttpDepartmentService(),
    hospitals: new HttpHospitalService(),
    appointments: new HttpAppointmentService(),
    medicalRecords: new HttpMedicalRecordService(),
    payments: new HttpPaymentService(),
    aiNavigator: new HttpAINavigatorService(),
    notifications: new HttpNotificationService(),
  };
}
