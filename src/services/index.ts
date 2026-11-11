import type { ServiceContainer } from "./interfaces";
import { createHttpServices } from "./api/httpServices";
import { mockServices } from "./mocks";
import { demoDb } from "./mocks/store";

/**
 * The only place the UI resolves a service implementation.
 *
 * Defaults to the mock container so every dashboard is usable before the
 * backend exists. Set `VITE_DATA_SOURCE=http` once the API contract is final.
 */
export const services: ServiceContainer =
  import.meta.env.VITE_DATA_SOURCE === "http" ? createHttpServices() : mockServices;

export const appointmentService = services.appointments;
export const authService = services.auth;
export const doctorService = services.doctors;
export const hospitalService = services.hospitals;
export const medicalRecordService = services.medicalRecords;
export const notificationService = services.notifications;
export const patientService = services.patients;
export const paymentService = services.payments;
export const aiNavigatorService = services.aiNavigator;

export { demoDb };

export type { ServiceContainer };
