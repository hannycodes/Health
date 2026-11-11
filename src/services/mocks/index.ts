import type { ServiceContainer } from "@/services/interfaces";
import { MockAIHealthService } from "./aiHealthService";
import { MockAppointmentService } from "./appointmentService";
import {
  MockAdminService,
  MockAnalyticsService,
  MockAuditLogService,
  MockSettingsService,
  MockUserService,
} from "./adminServices";
import { MockAuthService } from "./authService";
import {
  MockDoctorService,
  MockHospitalService,
  MockNotificationService,
  MockPatientService,
} from "./directoryServices";
import {
  MockAINavigatorService,
  MockMedicalRecordService,
  MockPaymentService,
} from "./clinicalServices";

/**
 * Mock service singletons.
 *
 * Instances are created once per module so patient, doctor and hospital-admin
 * screens share the same in-memory store.
 */
export const mockServices: ServiceContainer = {
  auth: new MockAuthService(),
  users: new MockUserService(),
  administrators: new MockAdminService(),
  auditLogs: new MockAuditLogService(),
  analytics: new MockAnalyticsService(),
  settings: new MockSettingsService(),
  patients: new MockPatientService(),
  doctors: new MockDoctorService(),
  hospitals: new MockHospitalService(),
  appointments: new MockAppointmentService(),
  medicalRecords: new MockMedicalRecordService(),
  payments: new MockPaymentService(),
  aiNavigator: new MockAINavigatorService(),
  aiHealth: new MockAIHealthService(),
  notifications: new MockNotificationService(),
};
