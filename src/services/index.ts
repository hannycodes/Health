import type { ServiceContainer } from "./interfaces";
import { createHttpServices } from "./api/httpServices";
import { mockServices } from "./mocks";
import { demoDb } from "./mocks/store";

const httpServices = createHttpServices();

/**
 * Auth, platform administration, the AI health assistant and shared directory
 * data talk to the local API (`server/api.ts`, mounted at `/api` by Vite).
 * Patient-side appointment, payment and medical-record flows still use the
 * shared mock services until those endpoints are added.
 *
 * `VITE_DATA_SOURCE=mock` keeps tests fully in-memory; `http` routes every
 * service through the API.
 */
const hybridServices: ServiceContainer = {
  ...mockServices,
  auth: httpServices.auth,
  users: httpServices.users,
  administrators: httpServices.administrators,
  auditLogs: httpServices.auditLogs,
  analytics: httpServices.analytics,
  settings: httpServices.settings,
  hospitals: httpServices.hospitals,
  doctors: httpServices.doctors,
  patients: httpServices.patients,
  notifications: httpServices.notifications,
  aiHealth: httpServices.aiHealth,
};

export const services: ServiceContainer =
  import.meta.env.VITE_DATA_SOURCE === "mock"
    ? mockServices
    : import.meta.env.VITE_DATA_SOURCE === "http"
      ? httpServices
      : hybridServices;

export const appointmentService = services.appointments;
export const authService = services.auth;
export const doctorService = services.doctors;
export const hospitalService = services.hospitals;
export const medicalRecordService = services.medicalRecords;
export const notificationService = services.notifications;
export const patientService = services.patients;
export const paymentService = services.payments;
export const aiNavigatorService = services.aiNavigator;

export const userService = services.users;
export const adminService = services.administrators;
export const auditLogService = services.auditLogs;
export const analyticsService = services.analytics;
export const settingsService = services.settings;

export { demoDb };

export type { ServiceContainer };
