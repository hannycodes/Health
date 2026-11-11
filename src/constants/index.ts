import type {
  AccountStatus,
  AppointmentStatus,
  AuditAction,
  HospitalApprovalStatus,
  HospitalType,
  PaymentStatus,
  Role,
  DepartmentStatus,
  DoctorAccountStatus,
  HospitalServiceOffering,
  Weekday,
} from "@/types";

export const APP_NAME = "MyHealth";
export const APP_TAGLINE =
  "AI-assisted healthcare navigation and appointment coordination";

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: "Patient",
  DOCTOR: "Doctor",
  HOSPITAL_ADMIN: "Hospital Admin",
  SUPER_ADMIN: "Super Admin",
};

export const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  HOSPITAL_ADMIN: "/hospital-admin",
  SUPER_ADMIN: "/admin/dashboard",
};

export interface StatusMeta {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  tone: "neutral" | "success" | "warning" | "danger" | "info";
}

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  BOOKED: { label: "Booked", variant: "default", tone: "info" },
  CANCELLED: { label: "Cancelled", variant: "destructive", tone: "danger" },
  COMPLETED: { label: "Completed", variant: "secondary", tone: "success" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  UNPAID_AT_HOSPITAL: {
    label: "Unpaid at hospital",
    variant: "outline",
    tone: "warning",
  },
  PENDING: { label: "Pending", variant: "outline", tone: "info" },
  PAID: { label: "Paid", variant: "secondary", tone: "success" },
  FAILED: { label: "Failed", variant: "destructive", tone: "danger" },
};

export const HOSPITAL_APPROVAL_META: Record<HospitalApprovalStatus, StatusMeta> = {
  APPROVED: { label: "Approved", variant: "secondary", tone: "success" },
  PENDING: { label: "Pending review", variant: "outline", tone: "warning" },
  REJECTED: { label: "Rejected", variant: "destructive", tone: "danger" },
  SUSPENDED: { label: "Suspended", variant: "destructive", tone: "danger" },
};

export const ACCOUNT_STATUS_META: Record<AccountStatus, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "secondary", tone: "success" },
  PENDING: { label: "Pending", variant: "outline", tone: "warning" },
  SUSPENDED: { label: "Suspended", variant: "destructive", tone: "danger" },
  DISABLED: { label: "Disabled", variant: "destructive", tone: "neutral" },
};

export const HOSPITAL_TYPE_LABELS: Record<HospitalType, string> = {
  GENERAL: "General hospital",
  SPECIALTY: "Specialty clinic",
  REFERRAL: "Referral center",
  CLINIC: "Clinic",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  HOSPITAL_REGISTERED: "Hospital registered",
  HOSPITAL_APPROVED: "Hospital approved",
  HOSPITAL_REJECTED: "Hospital rejected",
  HOSPITAL_SUSPENDED: "Hospital suspended",
  HOSPITAL_REACTIVATED: "Hospital reactivated",
  ADMINISTRATOR_INVITED: "Administrator invited",
  ADMINISTRATOR_REASSIGNED: "Administrator reassigned",
  USER_STATUS_CHANGED: "User account status changed",
  ROLE_ASSIGNED: "Role assignment changed",
  SETTINGS_UPDATED: "Platform settings updated",
};

export const PAYMENT_METHOD_LABELS = {
  ONLINE: "Pay online",
  PAY_AT_HOSPITAL: "Pay at hospital",
} as const;

export const HOSPITAL_SERVICE_LABELS: Record<HospitalServiceOffering, string> = {
  EMERGENCY: "Emergency services",
  OUTPATIENT: "Outpatient clinics",
  INPATIENT: "Inpatient wards",
  LABORATORY: "Laboratory",
  IMAGING: "Imaging & radiology",
  PHARMACY: "Pharmacy",
};

export const DEPARTMENT_STATUS_LABELS: Record<DepartmentStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const DOCTOR_ACCOUNT_STATUS_LABELS: Record<DoctorAccountStatus, string> = {
  ACTIVE: "Account active",
  PENDING_INVITATION: "Invitation pending",
};

export const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const DEMO_STORAGE_KEY = "myhealth:demo-db:v1";
export const AUTH_STORAGE_KEY = "myhealth:auth:v1";
export const AUTH_SESSION_STORAGE_KEY = "myhealth:auth-session:v1";

/** Dispatched by the shared Axios client when the backend rejects a session. */
export const SESSION_EXPIRED_EVENT = "myhealth:session-expired";

export const ACCOUNT_STATUS_FALLBACK: AccountStatus = "ACTIVE";
