import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageConsentDialogProps {
  open: boolean;
  fileName: string;
  onConsent: () => void;
  onDecline: () => void;
}

/**
 * Explicit consent before a symptom photo leaves the device.
 *
 * Images can contain sensitive health information, so the patient must accept
 * this notice for every attachment they add.
 */
export function ImageConsentDialog({
  open,
  fileName,
  onConsent,
  onDecline,
}: ImageConsentDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDecline();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="text-primary flex items-center gap-2 text-xs font-medium uppercase">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Image privacy
          </div>
          <DialogTitle>Share “{fileName}” with the AI Assistant?</DialogTitle>
          <DialogDescription>
            Images of a symptom can reveal sensitive health information. Your image
            will be sent to the MyHealth backend so it can be reviewed as part of your
            question — it is not sent straight to an external AI provider from this
            browser.
          </DialogDescription>
        </DialogHeader>

        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          <li>Only attach an image you are comfortable sharing for this purpose.</li>
          <li>Avoid faces, documents or anything unrelated to the symptom.</li>
          <li>A photo cannot confirm or rule out a condition.</li>
          <li>You can remove the image before sending.</li>
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            Remove image
          </Button>
          <Button onClick={onConsent}>I consent — use this image</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
