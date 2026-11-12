import type { Appointment } from "@/types";
import { todayISO } from "@/utils/format";

/** Presentation helpers used only by the Doctor Portal. */

export function calculateAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

export function ageLabel(dateOfBirth?: string): string {
  const age = calculateAge(dateOfBirth);
  return age === null ? "Age not recorded" : `${age} years`;
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A consultation can only be completed once its day has arrived. Future
 * bookings and already-finished visits are not eligible, and the appointment
 * service enforces the same rules server-side.
 */
export function canCompleteAppointment(appointment: Appointment): boolean {
  return appointment.status === "BOOKED" && appointment.date <= todayISO();
}

export function firstName(fullName: string): string {
  return fullName.replace(/^Dr\.?\s+/i, "").split(" ")[0] ?? fullName;
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
