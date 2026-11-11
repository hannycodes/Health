import { FileText, ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ClinicalAttachment } from "@/features/doctor/services/clinicalAssistantService";
import { humanFileSize } from "@/features/doctor/utils";
import { cn } from "@/lib/utils";

interface ClinicalAttachmentPreviewProps {
  attachment: ClinicalAttachment;
  onRemove?: () => void;
  readOnly?: boolean;
  className?: string;
}

/** Preview chip for an image or document attachment. */
export function ClinicalAttachmentPreview({
  attachment,
  onRemove,
  readOnly = false,
  className,
}: ClinicalAttachmentPreviewProps) {
  return (
    <div
      className={cn(
        "bg-card flex max-w-xs items-center gap-2 rounded-lg border p-1.5 pr-2",
        className,
      )}
    >
      {attachment.kind === "image" && attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt={`Preview of ${attachment.name}`}
          className="size-9 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded">
          {attachment.kind === "image" ? (
            <ImageIcon className="size-4" aria-hidden="true" />
          ) : (
            <FileText className="size-4" aria-hidden="true" />
          )}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{attachment.name}</p>
        <p className="text-muted-foreground text-[11px]">
          {attachment.kind === "image" ? "Image" : "Document"} ·{" "}
          {humanFileSize(attachment.size)}
        </p>
      </div>

      {!readOnly && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={`Remove ${attachment.name}`}
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
