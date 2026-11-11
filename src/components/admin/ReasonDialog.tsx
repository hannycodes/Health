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

interface ReasonDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  requiresReason?: boolean;
  trigger: ReactNode;
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Confirmation dialog for account actions. The consequence is explained before
 * submitting, and a reason is required where the backend records one.
 */
export function ReasonDialog({
  title,
  description,
  confirmLabel,
  destructive = false,
  requiresReason = false,
  trigger,
  onConfirm,
}: ReasonDialogProps) {
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
    if (requiresReason && reason.trim().length < 10) {
      setReasonError("Please give a reason of at least 10 characters.");
      return;
    }

    setIsPending(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requiresReason && (
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${title.replace(/\s+/g, "-").toLowerCase()}`}>
              Reason
            </Label>
            <Textarea
              id={`reason-${title.replace(/\s+/g, "-").toLowerCase()}`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Explain the action for the audit record…"
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
            variant={destructive ? "destructive" : "default"}
            onClick={() => void handleConfirm()}
            disabled={isPending}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
