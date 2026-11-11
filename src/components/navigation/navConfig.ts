import {
  Bell,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileHeart,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Role } from "@/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

/**
 * Role-specific sidebar navigation.
 *
 * Add new pages here rather than hard-coding links inside layouts. Keep the
 * route path in sync with `src/routes/AppRoutes.tsx`.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  PATIENT: [
    { label: "Dashboard", to: "/patient", icon: LayoutDashboard, end: true },
    { label: "Hospitals", to: "/patient/hospitals", icon: Building2 },
    { label: "Doctors", to: "/patient/doctors", icon: Stethoscope },
    { label: "AI Navigator", to: "/patient/ai-navigator", icon: Sparkles },
    { label: "Appointments", to: "/patient/appointments", icon: CalendarDays },
    { label: "Medical History", to: "/patient/medical-history", icon: FileHeart },
    { label: "Profile", to: "/patient/profile", icon: UserRound },
  ],
  DOCTOR: [
    { label: "Dashboard", to: "/doctor", icon: LayoutDashboard, end: true },
    { label: "Appointments", to: "/doctor/appointments", icon: CalendarDays },
    { label: "Patients", to: "/doctor/patients", icon: UsersRound },
    { label: "AI Clinical Assistant", to: "/doctor/assistant", icon: Sparkles },
    { label: "Availability", to: "/doctor/availability", icon: CalendarRange },
    { label: "Notifications", to: "/doctor/notifications", icon: Bell },
    { label: "Profile", to: "/doctor/profile", icon: UserRound },
  ],
  HOSPITAL_ADMIN: [
    { label: "Dashboard", to: "/hospital-admin", icon: LayoutDashboard, end: true },
    { label: "Doctors", to: "/hospital-admin/doctors", icon: Stethoscope },
    { label: "Appointments", to: "/hospital-admin/appointments", icon: CalendarDays },
    { label: "Hospital Profile", to: "/hospital-admin/profile", icon: Building2 },
    { label: "Capacity", to: "/hospital-admin/capacity", icon: ClipboardList },
  ],
  SUPER_ADMIN: [
    { label: "Dashboard", to: "/super-admin", icon: LayoutDashboard, end: true },
    { label: "Hospitals", to: "/super-admin/hospitals", icon: Building2 },
    { label: "Users", to: "/super-admin/users", icon: Users },
    { label: "Hospital Approvals", to: "/super-admin/approvals", icon: ShieldCheck },
  ],
};
