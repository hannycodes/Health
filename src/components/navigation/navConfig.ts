import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileHeart,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UserCog,
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
    { label: "Availability", to: "/doctor/availability", icon: CalendarRange },
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
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      icon: LayoutDashboard,
      end: true,
    },
    { label: "Hospitals", to: "/admin/hospitals", icon: Building2, end: true },
    {
      label: "Pending approvals",
      to: "/admin/hospitals/pending",
      icon: ShieldCheck,
    },
    { label: "Users", to: "/admin/users", icon: Users, end: true },
    { label: "Administrators", to: "/admin/administrators", icon: UserCog },
    { label: "Doctors", to: "/admin/doctors", icon: Stethoscope },
    { label: "Patients", to: "/admin/patients", icon: UsersRound },
    { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    { label: "Activity & audit", to: "/admin/activity", icon: Activity },
    { label: "Notifications", to: "/admin/notifications", icon: Bell },
    { label: "Platform settings", to: "/admin/settings", icon: Settings },
  ],
};
