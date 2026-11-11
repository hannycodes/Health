import type { AppointmentStatus, PaymentStatus, Role } from "@/types";

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
  SUPER_ADMIN: "/super-admin",
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

export const PAYMENT_METHOD_LABELS = {
  ONLINE: "Pay online",
  PAY_AT_HOSPITAL: "Pay at hospital",
} as const;

export const DEMO_STORAGE_KEY = "myhealth:demo-db:v1";
export const AUTH_STORAGE_KEY = "myhealth:auth:v1";
