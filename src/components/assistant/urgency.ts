import type { CareUrgency } from "@/types";

/**
 * Visual treatment for each care urgency.
 *
 * Colour is never the only signal: every entry carries a text label plus a
 * plain-language hint, and none of them claims to be a diagnosis.
 */
export interface UrgencyMeta {
  label: string;
  hint: string;
  container: string;
  badge: string;
}

export const URGENCY_META: Record<CareUrgency, UrgencyMeta> = {
  EMERGENCY: {
    label: "Emergency",
    hint: "Seek emergency care now — do not wait for an appointment.",
    container: "border-red-300 bg-red-50 text-red-900",
    badge: "border-red-300 bg-red-100 text-red-800",
  },
  URGENT: {
    label: "Urgent medical attention",
    hint: "Arrange an in-person assessment within 24 hours.",
    container: "border-orange-300 bg-orange-50 text-orange-900",
    badge: "border-orange-300 bg-orange-100 text-orange-800",
  },
  ROUTINE: {
    label: "Routine consultation",
    hint: "Book a routine appointment at a convenient time.",
    container: "border-sky-200 bg-sky-50 text-sky-900",
    badge: "border-sky-200 bg-sky-100 text-sky-800",
  },
  INFORMATIONAL: {
    label: "General information",
    hint: "General guidance only — no urgency indicated.",
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
};
