import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { Hospital } from "@/types";

export type HospitalDialogMode = "approve" | "reject" | "suspend" | "reactivate";

const CONFIG: Record<
  HospitalDialogMode,
  {
    title: string;
    confirmLabel: string;
    destructive: boolean;
    requiresReason: boolean;
    consequence: string;
    success: string;
  }
> = {
  approve: {
    title: "Approve this hospital?",
    confirmLabel: "Approve hospital",
    destructive: false,
    requiresReason: false,
    consequence:
      "Approval lists the hospital to patients, unlocks its administrator workspace and allows appointments to be booked. The decision is recorded in the audit log.",
    success: "Hospital approved.",
  },
  reject: {
    title: "Reject this application?",
    confirmLabel: "Reject application",
    destructive: true,
    requiresReason: true,
    consequence:
      "Rejection closes the application and is stored with your reason in the audit log. The hospital is not deleted and can reapply through the approved workflow.",
    success: "Hospital application rejected.",
  },
  suspend: {
    title: "Suspend this hospital?",
    confirmLabel: "Suspend hospital",
    destructive: true,
    requiresReason: true,
    consequence:
      "Suspension hides the hospital from patients and blocks its workspace. Historical appointments, payments and medical records are retained, never deleted.",
    success: "Hospital suspended.",
  },
  reactivate: {
    title: "Reactivate this hospital?",
    confirmLabel: "Reactivate hospital",
    destructive: false,
    requiresReason: false,
    consequence:
      "Reactivation restores the hospital's visibility and workspace access. The hospital's history is unchanged.",
    success: "Hospital reactivated.",
  },
};

interface HospitalApprovalDialogProps {
  hospital: Hospital;
  mode: HospitalDialogMode;
  trigger: ReactNode;
  onDone?: () => void;
}

export function HospitalApprovalDialog({
  hospital,
  mode,
  trigger,
  onDone,
}: HospitalApprovalDialogProps) {
  const config = CONFIG[mode];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReason("");
      setReasonError(null);
    }
  }

  async function handleConfirm() {
    if (config.requiresReason && reason.trim().length < 10) {
      setReasonError("Please give a reason of at least 10 characters.");
      return;
    }

    setIsPending(true);
    try {
      if (mode === "approve") await services.hospitals.approve(hospital.id);
      if (mode === "reject") await services.hospitals.reject(hospital.id, reason);
      if (mode === "suspend") await services.hospitals.suspend(hospital.id, reason);
      if (mode === "reactivate")
        await services.hospitals.reactivate(hospital.id);

      toast.success(config.success);
      setOpen(false);
      setReason("");
      onDone?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {hospital.name} — {config.consequence}
          </DialogDescription>
        </DialogHeader>

        {config.requiresReason && (
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${mode}-${hospital.id}`}>Reason</Label>
            <Textarea
              id={`reason-${mode}-${hospital.id}`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Explain the decision for the audit record…"
              aria-invalid={Boolean(reasonError)}
            />
            {reasonError && (
              <p className="text-destructive text-xs">{reasonError}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={config.destructive ? "destructive" : "default"}
            onClick={() => void handleConfirm()}
            disabled={isPending}
          >
            {isPending ? "Working…" : config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
