import {
  ACCOUNT_STATUS_META,
  APPOINTMENT_STATUS_META,
  HOSPITAL_APPROVAL_META,
  PAYMENT_STATUS_META,
  type StatusMeta,
} from "@/constants";
import type {
  AccountStatus,
  AppointmentStatus,
  HospitalApprovalStatus,
  PaymentStatus,
} from "@/types";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<StatusMeta["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  neutral: "border-border bg-muted text-muted-foreground",
};

type StatusBadgeProps =
  | { kind: "appointment"; value: AppointmentStatus; className?: string }
  | { kind: "payment"; value: PaymentStatus; className?: string }
  | { kind: "hospital"; value: HospitalApprovalStatus; className?: string }
  | { kind: "account"; value: AccountStatus; className?: string };

/** Single source of truth for status colours and labels. */
export function StatusBadge(props: StatusBadgeProps) {
  const meta =
    props.kind === "appointment"
      ? APPOINTMENT_STATUS_META[props.value]
      : props.kind === "payment"
        ? PAYMENT_STATUS_META[props.value]
        : props.kind === "hospital"
          ? HOSPITAL_APPROVAL_META[props.value]
          : ACCOUNT_STATUS_META[props.value];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[meta.tone],
        props.className,
      )}
    >
      {meta.label}
    </span>
  );
}
