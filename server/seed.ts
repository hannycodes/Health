import type {
  AIConversation,
  Appointment,
  AuditLog,
  Doctor,
  Hospital,
  HospitalAdmin,
  Notification,
  Patient,
  PlatformSettings,
  SuperAdmin,
} from "../src/types";

export interface StoredCredential {
  userId: string;
  email: string;
  password: string;
}

export interface StoredReset {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ApiDatabase {
  patients: Patient[];
  doctors: Doctor[];
  hospitalAdmins: HospitalAdmin[];
  superAdmins: SuperAdmin[];
  hospitals: Hospital[];
  appointments: Appointment[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  conversations: AIConversation[];
  credentials: StoredCredential[];
  passwordResets: StoredReset[];
  settings: PlatformSettings;
}

export const SEED_PASSWORD = "myhealth123";

const at = "2026-10-01T08:00:00.000Z";

const capacity = (
  totalBeds: number,
  occupiedBeds: number,
  totalDoctors: number,
  icuBeds: number,
  occupiedIcuBeds: number,
) => ({ totalBeds, occupiedBeds, totalDoctors, icuBeds, occupiedIcuBeds });

const hospitals: Hospital[] = [
  {
    id: "hsp-001",
    name: "Addis Care General Hospital",
    city: "Addis Ababa",
    address: "Bole Road, near Meskel Square, Addis Ababa",
    phone: "+251 116 551 200",
    email: "info@addiscare.example.com",
    description:
      "A 220-bed general hospital offering cardiology, neurology and internal medicine services with 24/7 emergency care.",
    specialties: ["Cardiology", "Neurology", "General Medicine"],
    rating: 4.7,
    isVerified: true,
    approvalStatus: "APPROVED",
    hospitalType: "GENERAL",
    region: "Addis Ababa",
    website: "https://addiscare.example.com",
    representativeName: "Hanna Solomon",
    representativeEmail: "hospital@myhealth.et",
    representativePhone: "+251 911 700 100",
    submittedAt: "2026-06-12T08:00:00.000Z",
    reviewedAt: "2026-06-20T08:00:00.000Z",
    reviewedBy: "Super Admin",
    capacity: capacity(220, 178, 3, 18, 13),
    createdAt: "2026-06-12T08:00:00.000Z",
  },
  {
    id: "hsp-002",
    name: "St. Gabriel Specialty Clinic",
    city: "Addis Ababa",
    address: "Kazanchis, Cape Verde Street, Addis Ababa",
    phone: "+251 116 618 900",
    email: "care@stgabriel.example.com",
    description:
      "Specialty clinic for pediatrics, orthopedics and maternal health with an on-site diagnostic laboratory.",
    specialties: ["Pediatrics", "Orthopedics", "Obstetrics & Gynecology"],
    rating: 4.6,
    isVerified: true,
    approvalStatus: "APPROVED",
    hospitalType: "SPECIALTY",
    region: "Addis Ababa",
    representativeName: "Getachew Bekele",
    representativeEmail: "getachew.bekele@myhealth.et",
    submittedAt: "2026-06-28T08:00:00.000Z",
    reviewedAt: "2026-07-05T10:20:00.000Z",
    reviewedBy: "Super Admin",
    capacity: capacity(90, 61, 3, 8, 4),
    createdAt: "2026-06-28T08:00:00.000Z",
  },
  {
    id: "hsp-003",
    name: "Hawassa Referral Medical Center",
    city: "Hawassa",
    address: "Piazza Area, Hawassa, Sidama Region",
    phone: "+251 462 202 330",
    email: "contact@hawassareferral.example.com",
    description:
      "Regional referral center serving Sidama and the southern corridor, with dermatology and eye care clinics.",
    specialties: ["Dermatology", "Ophthalmology", "General Medicine"],
    rating: 4.3,
    isVerified: true,
    approvalStatus: "APPROVED",
    hospitalType: "REFERRAL",
    region: "Sidama",
    representativeName: "Tigist Alemayehu",
    representativeEmail: "tigist@hawassareferral.example.com",
    submittedAt: "2026-07-12T08:00:00.000Z",
    reviewedAt: "2026-07-30T09:40:00.000Z",
    reviewedBy: "Super Admin",
    capacity: capacity(140, 102, 2, 10, 6),
    createdAt: "2026-07-12T08:00:00.000Z",
  },
  {
    id: "hsp-004",
    name: "Mekelle Hope Hospital",
    city: "Mekelle",
    address: "Hadnet Sub-city, Mekelle, Tigray",
    phone: "+251 344 401 118",
    email: "admin@mekellehope.example.com",
    description:
      "Newly opened private hospital awaiting platform verification before accepting appointments.",
    specialties: ["General Medicine", "Pediatrics"],
    rating: 0,
    isVerified: false,
    approvalStatus: "PENDING",
    hospitalType: "GENERAL",
    region: "Tigray",
    website: "https://mekellehope.example.com",
    representativeName: "Meron Tesfaye",
    representativeEmail: "meron.tesfaye@myhealth.et",
    representativePhone: "+251 911 700 300",
    submittedAt: "2026-11-02T08:35:00.000Z",
    documents: [
      {
        id: "docm-001",
        name: "Operating licence.pdf",
        type: "LICENSE",
        uploadedAt: "2026-11-02T08:30:00.000Z",
      },
      {
        id: "docm-002",
        name: "Accreditation certificate.pdf",
        type: "ACCREDITATION",
        uploadedAt: "2026-11-02T08:31:00.000Z",
      },
    ],
    capacity: capacity(60, 0, 0, 4, 0),
    createdAt: "2026-11-02T08:35:00.000Z",
  },
  {
    id: "hsp-005",
    name: "Blue Nile Community Clinic",
    city: "Bahir Dar",
    address: "Kebele 05, Bahir Dar, Amhara",
    phone: "+251 582 201 744",
    email: "hello@bluenile.example.com",
    description:
      "Community clinic applying to join MyHealth as a primary care partner in Bahir Dar.",
    specialties: ["General Medicine", "Pediatrics"],
    rating: 0,
    isVerified: false,
    approvalStatus: "REJECTED",
    hospitalType: "CLINIC",
    region: "Amhara",
    representativeName: "Yohannes Alemu",
    representativeEmail: "yohannes@bluenile.example.com",
    representativePhone: "+251 582 201 900",
    submittedAt: "2026-09-20T09:00:00.000Z",
    reviewedAt: "2026-09-24T11:15:00.000Z",
    reviewedBy: "Super Admin",
    rejectionReason:
      "The submitted operating licence expired in August 2026. Upload a renewed licence and resubmit the application.",
    documents: [
      {
        id: "docm-003",
        name: "Operating licence (expired).pdf",
        type: "LICENSE",
        uploadedAt: "2026-09-20T08:52:00.000Z",
      },
    ],
    capacity: capacity(24, 0, 0, 0, 0),
    createdAt: "2026-09-20T09:00:00.000Z",
  },
  {
    id: "hsp-006",
    name: "Dire Dawa Community Hospital",
    city: "Dire Dawa",
    address: "Kefira, Dire Dawa",
    phone: "+251 251 112 807",
    email: "info@diredawacommunity.example.com",
    description:
      "Regional community hospital serving Dire Dawa with general medicine and maternal health services.",
    specialties: ["General Medicine", "Obstetrics & Gynecology"],
    rating: 4.1,
    isVerified: false,
    approvalStatus: "SUSPENDED",
    hospitalType: "GENERAL",
    region: "Dire Dawa",
    representativeName: "Fatuma Ahmed",
    representativeEmail: "fatuma@diredawacommunity.example.com",
    representativePhone: "+251 251 112 900",
    submittedAt: "2026-06-12T07:00:00.000Z",
    reviewedAt: "2026-10-15T13:00:00.000Z",
    reviewedBy: "Super Admin",
    suspensionReason:
      "Temporarily suspended while an infection-control review is completed. Existing records are retained.",
    capacity: capacity(110, 64, 0, 6, 3),
    createdAt: "2026-06-12T07:00:00.000Z",
  },
];

const patients: Patient[] = [
  {
    id: "pat-001",
    email: "patient@myhealth.et",
    fullName: "Abebe Tesfaye",
    role: "PATIENT",
    phone: "+251 911 234 567",
    dateOfBirth: "1989-04-12",
    gender: "MALE",
    bloodType: "O+",
    address: "Bole Sub-city, Woreda 03, Addis Ababa",
    emergencyContact: "+251 911 765 432 — Meseret Tesfaye",
    status: "ACTIVE",
    createdAt: at,
  },
  {
    id: "pat-002",
    email: "hana.girma@example.com",
    fullName: "Hana Girma",
    role: "PATIENT",
    phone: "+251 912 118 442",
    dateOfBirth: "1996-11-02",
    gender: "FEMALE",
    bloodType: "A+",
    address: "Kirkos Sub-city, Addis Ababa",
    status: "ACTIVE",
    createdAt: "2026-10-18T09:12:00.000Z",
  },
  {
    id: "pat-003",
    email: "dawit.mekonnen@example.com",
    fullName: "Dawit Mekonnen",
    role: "PATIENT",
    phone: "+251 918 664 129",
    dateOfBirth: "1978-06-25",
    gender: "MALE",
    bloodType: "B+",
    address: "Hawassa, Sidama",
    status: "ACTIVE",
    createdAt: "2026-09-02T10:00:00.000Z",
  },
  {
    id: "pat-004",
    email: "marta.alemu@example.com",
    fullName: "Marta Alemu",
    role: "PATIENT",
    phone: "+251 914 552 310",
    dateOfBirth: "2001-01-19",
    gender: "FEMALE",
    bloodType: "AB+",
    address: "Yeka Sub-city, Addis Ababa",
    status: "ACTIVE",
    createdAt: "2026-07-20T09:30:00.000Z",
  },
  {
    id: "pat-005",
    email: "sara.bekele@example.com",
    fullName: "Sara Bekele",
    role: "PATIENT",
    phone: "+251 913 447 902",
    dateOfBirth: "1993-09-08",
    gender: "FEMALE",
    bloodType: "O-",
    address: "Bahir Dar, Amhara",
    status: "SUSPENDED",
    createdAt: "2026-10-30T10:20:00.000Z",
  },
];

const doctorSeed = (
  id: string,
  email: string,
  fullName: string,
  hospitalId: string,
  specialty: Doctor["specialty"],
  licenseNumber: string,
  yearsExperience: number,
  consultationFee: number,
  createdAt: string,
): Doctor => ({
  id,
  email,
  fullName,
  role: "DOCTOR",
  phone: "+251 911 556 000",
  hospitalId,
  specialty,
  licenseNumber,
  yearsExperience,
  bio: `${fullName} practices ${specialty.toLowerCase()} at their hospital.`,
  consultationFee,
  rating: 4.6,
  isAcceptingPatients: true,
  status: "ACTIVE",
  createdAt,
});

const doctors: Doctor[] = [
  doctorSeed("doc-001", "doctor@myhealth.et", "Dr. Selamawit Bekele", "hsp-001", "Cardiology", "ET-MD-10231", 12, 800, at),
  doctorSeed("doc-002", "yonas.tadesse@myhealth.et", "Dr. Yonas Tadesse", "hsp-001", "General Medicine", "ET-MD-10442", 7, 400, "2026-09-05T09:00:00.000Z"),
  doctorSeed("doc-003", "meron.haile@myhealth.et", "Dr. Meron Haile", "hsp-002", "Pediatrics", "ET-MD-10987", 9, 500, at),
  doctorSeed("doc-004", "bereket.assefa@myhealth.et", "Dr. Bereket Assefa", "hsp-002", "Orthopedics", "ET-MD-10775", 15, 900, "2026-08-14T09:00:00.000Z"),
  doctorSeed("doc-005", "tigist.alemayehu@myhealth.et", "Dr. Tigist Alemayehu", "hsp-003", "Dermatology", "ET-MD-10336", 6, 600, at),
  doctorSeed("doc-006", "samuel.gebre@myhealth.et", "Dr. Samuel Gebre", "hsp-001", "Neurology", "ET-MD-10112", 18, 1000, "2026-07-11T09:00:00.000Z"),
  doctorSeed("doc-007", "rahel.wondimu@myhealth.et", "Dr. Rahel Wondimu", "hsp-002", "Obstetrics & Gynecology", "ET-MD-10654", 11, 750, at),
  doctorSeed("doc-008", "kalkidan.desta@myhealth.et", "Dr. Kalkidan Desta", "hsp-003", "Ophthalmology", "ET-MD-10890", 5, 550, "2026-10-22T09:00:00.000Z"),
];

const hospitalAdmins: HospitalAdmin[] = [
  {
    id: "adm-001",
    email: "hospital@myhealth.et",
    fullName: "Hanna Solomon",
    role: "HOSPITAL_ADMIN",
    phone: "+251 911 700 100",
    hospitalId: "hsp-001",
    status: "ACTIVE",
    createdAt: at,
  },
  {
    id: "adm-002",
    email: "getachew.bekele@myhealth.et",
    fullName: "Getachew Bekele",
    role: "HOSPITAL_ADMIN",
    phone: "+251 911 700 200",
    hospitalId: "hsp-002",
    status: "ACTIVE",
    createdAt: "2026-09-22T09:00:00.000Z",
  },
  {
    id: "adm-003",
    email: "meron.tesfaye@myhealth.et",
    fullName: "Meron Tesfaye",
    role: "HOSPITAL_ADMIN",
    phone: "+251 911 700 300",
    hospitalId: "hsp-004",
    status: "PENDING",
    createdAt: "2026-11-02T08:40:00.000Z",
  },
];

const superAdmins: SuperAdmin[] = [
  {
    id: "adm-000",
    email: "admin@myhealth.et",
    fullName: "Super Admin",
    role: "SUPER_ADMIN",
    phone: "+251 911 700 000",
    status: "ACTIVE",
    createdAt: at,
  },
];

type AppointmentSeed = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  Appointment["status"],
];

const appointmentSeed: AppointmentSeed[] = [
  ["apt-001", "pat-001", "doc-001", "hsp-001", "2026-11-18", "09:00", "09:30", "BOOKED"],
  ["apt-002", "pat-002", "doc-003", "hsp-002", "2026-11-20", "11:00", "11:30", "BOOKED"],
  ["apt-003", "pat-001", "doc-005", "hsp-003", "2026-10-20", "14:00", "14:30", "COMPLETED"],
  ["apt-004", "pat-003", "doc-002", "hsp-001", "2026-10-28", "10:30", "11:00", "CANCELLED"],
  ["apt-005", "pat-004", "doc-007", "hsp-002", "2026-11-16", "15:30", "16:00", "BOOKED"],
  ["apt-006", "pat-002", "doc-001", "hsp-001", "2026-11-11", "08:30", "09:00", "BOOKED"],
  ["apt-007", "pat-003", "doc-006", "hsp-001", "2026-10-21", "09:30", "10:00", "COMPLETED"],
  ["apt-008", "pat-004", "doc-004", "hsp-002", "2026-11-17", "10:00", "10:30", "BOOKED"],
];

const appointments: Appointment[] = appointmentSeed.map(
  ([id, patientId, doctorId, hospitalId, date, startTime, endTime, status]) => ({
    id,
    patientId,
    doctorId,
    hospitalId,
    date,
    startTime,
    endTime,
    status,
    reason: "Consultation booked through MyHealth.",
    createdAt: at,
    updatedAt: at,
  }),
);

type NotificationSeed = [string, string, string, string, string, boolean];

const notificationSeed: NotificationSeed[] = [
  ["ntf-005", "New hospital application", "Mekelle Hope Hospital submitted verification documents for review.", "2026-11-02T08:36:00.000Z", "/admin/hospitals/pending", false],
  ["ntf-006", "Hospital application rejected", "Blue Nile Community Clinic was rejected because its operating licence expired.", "2026-09-24T11:15:00.000Z", "/admin/hospitals/hsp-005", true],
  ["ntf-007", "Hospital suspended", "Dire Dawa Community Hospital was suspended pending an infection-control review.", "2026-10-15T13:00:00.000Z", "/admin/hospitals/hsp-006", true],
  ["ntf-008", "Administrator account created", "Meron Tesfaye was invited to administer Mekelle Hope Hospital.", "2026-11-02T08:41:00.000Z", "/admin/administrators", false],
  ["ntf-009", "Weekly platform summary ready", "Appointment volume and hospital activity for last week are available in analytics.", "2026-11-09T06:00:00.000Z", "/admin/analytics", true],
  ["ntf-010", "Patient account suspended", "Sara Bekele's account was suspended after repeated no-show reports.", "2026-10-30T10:25:00.000Z", "/admin/users/pat-005", true],
  ["ntf-011", "Platform settings updated", "Session policy and hospital verification requirements were reviewed.", "2026-10-01T08:10:00.000Z", "/admin/settings", true],
  ["ntf-012", "Doctor verification required", "Dr. Kalkidan Desta's professional details are awaiting verification.", "2026-11-05T09:20:00.000Z", "/admin/doctors", false],
  ["ntf-013", "New sign-in detected", "A Super Administrator session started from a new device. Review the audit log.", "2026-11-08T19:40:00.000Z", "/admin/activity", true],
];

const notifications: Notification[] = [
  {
    id: "ntf-004",
    userId: "adm-000",
    title: "Hospital approval pending",
    message: "Mekelle Hope Hospital submitted a verification request.",
    type: "APPROVAL",
    isRead: false,
    createdAt: at,
    link: "/admin/hospitals/pending",
  },
  ...notificationSeed.map(([id, title, message, createdAt, link, isRead]) => ({
    id,
    userId: "adm-000",
    title,
    message,
    type: "SYSTEM" as const,
    isRead,
    createdAt,
    link,
  })),
];

const audit = (
  id: string,
  action: AuditLog["action"],
  entityId: string,
  entityLabel: string,
  description: string,
  createdAt: string,
  metadata?: Record<string, string>,
): AuditLog => ({
  id,
  action,
  entityType: "HOSPITAL",
  entityId,
  entityLabel,
  description,
  actorId: "adm-000",
  actorName: "Super Admin",
  result: "SUCCESS",
  createdAt,
  metadata,
});

const auditLogs: AuditLog[] = [
  audit("aud-010", "ADMINISTRATOR_INVITED", "adm-003", "Meron Tesfaye", "Administrator invited to Mekelle Hope Hospital.", "2026-11-02T08:41:00.000Z", { hospital: "Mekelle Hope Hospital" }),
  audit("aud-009", "HOSPITAL_REGISTERED", "hsp-004", "Mekelle Hope Hospital", "New hospital application submitted for verification.", "2026-11-02T08:35:00.000Z"),
  audit("aud-008", "HOSPITAL_SUSPENDED", "hsp-006", "Dire Dawa Community Hospital", "Hospital suspended pending an infection-control review; records retained.", "2026-10-15T13:00:00.000Z"),
  audit("aud-007", "USER_STATUS_CHANGED", "pat-005", "Sara Bekele", "Account status changed from ACTIVE to SUSPENDED.", "2026-10-30T10:25:00.000Z", { from: "ACTIVE", to: "SUSPENDED", reason: "Repeated no-show reports." }),
  audit("aud-006", "SETTINGS_UPDATED", "platform", "Platform settings", "Session policy and hospital verification requirements reviewed.", "2026-10-01T08:10:00.000Z"),
  audit("aud-005", "HOSPITAL_REJECTED", "hsp-005", "Blue Nile Community Clinic", "Hospital application rejected: expired operating licence.", "2026-09-24T11:15:00.000Z"),
  audit("aud-004", "HOSPITAL_REGISTERED", "hsp-005", "Blue Nile Community Clinic", "New hospital application submitted for verification.", "2026-09-20T09:00:00.000Z"),
  audit("aud-003", "HOSPITAL_APPROVED", "hsp-003", "Hawassa Referral Medical Center", "Hospital application approved.", "2026-07-30T09:40:00.000Z"),
  audit("aud-002", "HOSPITAL_APPROVED", "hsp-002", "St. Gabriel Specialty Clinic", "Hospital application approved.", "2026-07-05T10:20:00.000Z"),
  audit("aud-001", "HOSPITAL_APPROVED", "hsp-001", "Addis Care General Hospital", "Hospital application approved.", "2026-06-20T08:00:00.000Z"),
];

const settings: PlatformSettings = {
  platformName: "MyHealth",
  platformDescription:
    "AI-assisted healthcare navigation and appointment coordination for Ethiopian hospitals and clinics.",
  supportEmail: "support@myhealth.et",
  supportPhone: "+251 116 000 000",
  patientRegistrationEnabled: true,
  hospitalRegistrationEnabled: true,
  requireHospitalVerificationDocuments: true,
  regions: ["Addis Ababa", "Amhara", "Dire Dawa", "Oromia", "Sidama", "Tigray"],
  hospitalTypes: ["GENERAL", "SPECIALTY", "REFERRAL", "CLINIC"],
  specialties: [
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
  ],
  sessionTimeoutMinutes: 480,
  requireStrongPasswords: true,
  adminSessionNote:
    "Super Administrator sessions are limited to eight hours. Every administrative action is recorded in the audit log.",
  updatedAt: "2026-10-01T08:10:00.000Z",
  updatedBy: "Super Admin",
};

const credentials: StoredCredential[] = [
  { userId: "pat-001", email: "patient@myhealth.et", password: SEED_PASSWORD },
  { userId: "doc-001", email: "doctor@myhealth.et", password: SEED_PASSWORD },
  { userId: "adm-001", email: "hospital@myhealth.et", password: SEED_PASSWORD },
  { userId: "adm-000", email: "admin@myhealth.et", password: SEED_PASSWORD },
  { userId: "pat-005", email: "sara.bekele@example.com", password: SEED_PASSWORD },
  { userId: "adm-003", email: "meron.tesfaye@myhealth.et", password: SEED_PASSWORD },
];

export function createSeedDatabase(): ApiDatabase {
  return {
    patients: structuredClone(patients),
    doctors: structuredClone(doctors),
    hospitalAdmins: structuredClone(hospitalAdmins),
    superAdmins: structuredClone(superAdmins),
    hospitals: structuredClone(hospitals),
    appointments: structuredClone(appointments),
    notifications: structuredClone(notifications),
    auditLogs: structuredClone(auditLogs),
    conversations: [],
    credentials: structuredClone(credentials),
    passwordResets: [],
    settings: structuredClone(settings),
  };
}
