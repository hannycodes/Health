import type { ServiceContainer } from "@/services/interfaces";
import { MockAppointmentService } from "./appointmentService";
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
  patients: new MockPatientService(),
  doctors: new MockDoctorService(),
  hospitals: new MockHospitalService(),
  appointments: new MockAppointmentService(),
  medicalRecords: new MockMedicalRecordService(),
  payments: new MockPaymentService(),
  aiNavigator: new MockAINavigatorService(),
  notifications: new MockNotificationService(),
};
