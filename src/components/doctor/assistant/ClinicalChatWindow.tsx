import { useEffect, useRef, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { ClinicalMessage } from "./ClinicalMessage";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type {
  ClinicalMessage as ClinicalMessageModel,
} from "@/features/doctor/services/clinicalAssistantService";

interface ClinicalChatWindowProps {
  messages: ClinicalMessageModel[];
  isSending: boolean;
  patientId?: string;
  renderActions?: (message: ClinicalMessageModel) => ReactNode;
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  "Summarize this patient's previous consultations.",
  "What information is missing from this consultation record?",
  "Organize these notes into documentation sections.",
  "Compare the findings recorded in this patient's visits.",
];

/** Message list; doctor and AI content are visibly distinguished. */
export function ClinicalChatWindow({
  messages,
  isSending,
  patientId,
  renderActions,
  onSelectPrompt,
}: ClinicalChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isSending]);

  return (
    <div className="space-y-5">
      {messages.length === 0 ? (
        <div className="border-border/70 bg-card flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-10 text-center">
          <span className="bg-secondary text-secondary-foreground flex size-11 items-center justify-center rounded-full">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">AI Clinical Assistant</p>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              Decision support for reviewing records, organizing notes and preparing
              documentation. Every response requires your review.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSelectPrompt(prompt)}
                className="hover:bg-accent rounded-full border px-3 py-1.5 text-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <ClinicalMessage
            key={message.id}
            message={message}
            patientId={patientId}
            renderActions={renderActions}
          />
        ))
      )}

      {isSending && <LoadingSpinner label="Preparing a reviewable response" />}
      <div ref={endRef} />
    </div>
  );
}
