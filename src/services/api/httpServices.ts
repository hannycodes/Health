import type {
  AIConversation,
  AIHealthRequest,
  AIHealthResponse,
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
  UploadedImage,
  User,
} from "@/types";
import type {
  AIHealthService,
  AINavigatorService,
  AppointmentService,
  AuthService,
  DoctorFilter,
  DoctorService,
  HospitalFilter,
  HospitalService,
  MedicalRecordService,
  NotificationService,
  PatientService,
  PaymentService,
  ServiceContainer,
} from "@/services/interfaces";
import { clearSession, readSession, writeSession } from "@/lib/session";
import { httpClient } from "@/lib/http";

/**
 * HTTP adapters — PLACEHOLDERS.
 *
 * These call conventional REST paths under `VITE_API_BASE_URL`. The backend
 * contract is not finalised yet (see API_CONTRACT.md), so treat every path as
 * provisional and confirm it with the backend owner before switching
 * `VITE_DATA_SOURCE` to "http". Nothing here is exercised by the demo.
 */

class HttpAuthService implements AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { data } = await httpClient.post<AuthSession>("/auth/login", credentials);
    writeSession(data);
    return data;
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

  async update(id: string, patch: Partial<Doctor>): Promise<Doctor> {
    const { data } = await httpClient.patch<Doctor>(`/doctors/${id}`, patch);
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

  async updateCapacity(
    id: string,
    patch: Partial<HospitalCapacity>,
  ): Promise<Hospital> {
    const { data } = await httpClient.patch<Hospital>(`/hospitals/${id}/capacity`, patch);
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

  async getById(id: string): Promise<MedicalRecord | null> {
    const { data } = await httpClient.get<MedicalRecord>(`/medical-records/${id}`);
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

/**
 * AI Health Assistant adapter — PLACEHOLDER.
 *
 * Images are uploaded to the backend, which owns the AI provider credential
 * and performs the model call. The browser never talks to an AI vendor.
 */
class HttpAIHealthService implements AIHealthService {
  async listConversations(patientId: string): Promise<AIConversation[]> {
    const { data } = await httpClient.get<AIConversation[]>("/ai/conversations", {
      params: { patientId },
    });
    return data;
  }

  async getConversation(conversationId: string): Promise<AIConversation | null> {
    const { data } = await httpClient.get<AIConversation>(
      `/ai/conversations/${conversationId}`,
    );
    return data;
  }

  async startConversation(patientId: string): Promise<AIConversation> {
    const { data } = await httpClient.post<AIConversation>("/ai/conversations", {
      patientId,
    });
    return data;
  }

  async uploadImage(file: File): Promise<UploadedImage> {
    // The file is read as a data URL and posted to our own backend, which
    // owns the AI provider credential. No browser secret, no vendor CORS.
    const dataBase64 = await readFileAsDataUrl(file);
    const { data } = await httpClient.post<UploadedImage>("/ai/images", {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      dataBase64,
    });
    return data;
  }

  async sendMessage(input: AIHealthRequest): Promise<AIHealthResponse> {
    const { data } = await httpClient.post<AIHealthResponse>(
      "/ai/health-assistant/messages",
      input,
    );
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

/** Read a local file as a data URL for the image upload endpoint. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export function createHttpServices(): ServiceContainer {
  return {
    auth: new HttpAuthService(),
    patients: new HttpPatientService(),
    doctors: new HttpDoctorService(),
    hospitals: new HttpHospitalService(),
    appointments: new HttpAppointmentService(),
    medicalRecords: new HttpMedicalRecordService(),
    payments: new HttpPaymentService(),
    aiNavigator: new HttpAINavigatorService(),
    aiHealth: new HttpAIHealthService(),
    notifications: new HttpNotificationService(),
  };
}
