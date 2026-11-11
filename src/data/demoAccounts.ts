import type { DemoAccount } from "@/types";

/**
 * Demo credentials for the mock authentication provider.
 *
 * These are intentionally public, non-secret demo logins. They exist only
 * because the backend authentication endpoint is not available yet. Delete
 * this file once real authentication lands.
 */
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Patient",
    email: "patient@myhealth.et",
    password: DEMO_PASSWORD,
    role: "PATIENT",
    description: "Abebe Tesfaye — books and tracks appointments",
  },
  {
    label: "Doctor",
    email: "doctor@myhealth.et",
    password: DEMO_PASSWORD,
    role: "DOCTOR",
    description: "Dr. Selamawit Bekele — Cardiology, Addis Care",
  },
  {
    label: "Hospital Admin",
    email: "hospital@myhealth.et",
    password: DEMO_PASSWORD,
    role: "HOSPITAL_ADMIN",
    description: "Hanna Solomon — Addis Care General Hospital",
  },
  {
    label: "Super Admin",
    email: "admin@myhealth.et",
    password: DEMO_PASSWORD,
    role: "SUPER_ADMIN",
    description: "Super Admin — platform administration",
  },
];
