import type { ReactNode } from "react";
import { Sparkles, Stethoscope } from "lucide-react";

import { ClinicalAttachmentPreview } from "./ClinicalAttachmentPreview";
import { AIResponseCard } from "./AIResponseCard";
import type { ClinicalMessage as ClinicalMessageModel } from "@/features/doctor/services/clinicalAssistantService";
import { formatChatTime } from "@/features/doctor/utils";
import { cn } from "@/lib/utils";

interface ClinicalMessageProps {
  message: ClinicalMessageModel;
  patientId?: string;
  renderActions?: (message: ClinicalMessageModel) => ReactNode;
}

/** Doctor messages and AI responses are visually and textually distinct. */
export function ClinicalMessage({ message, patientId, renderActions }: ClinicalMessageProps) {
  const isDoctor = message.role === "DOCTOR";

  return (
    <div className={cn("flex gap-3", isDoctor ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "mt-1 flex size-8 shrink-0 items-center justify-center rounded-full",
          isDoctor
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
        aria-hidden="true"
      >
        {isDoctor ? <Stethoscope className="size-4" /> : <Sparkles className="size-4" />}
      </span>

      <div
        className={cn(
          "min-w-0 max-w-full flex-1 space-y-2",
          isDoctor && "flex flex-col items-end",
        )}
      >
        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <span className="font-medium">
            {isDoctor ? "Doctor-entered note" : "AI Clinical Assistant · demonstration"}
          </span>
          <span>{formatChatTime(message.createdAt)}</span>
        </div>

        {isDoctor ? (
          <div className="bg-primary text-primary-foreground max-w-xl rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        ) : message.response ? (
          <div className="w-full">
            <AIResponseCard
              response={message.response}
              patientId={patientId}
              actions={renderActions?.(message)}
            />
          </div>
        ) : (
          <div className="bg-card rounded-2xl border px-4 py-2.5 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", isDoctor && "justify-end")}>
            {message.attachments.map((attachment) => (
              <ClinicalAttachmentPreview key={attachment.id} attachment={attachment} readOnly />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
