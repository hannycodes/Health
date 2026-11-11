import { useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PendingAttachment } from "@/components/assistant/types";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  attachments: PendingAttachment[];
  onFilesSelected: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
  isSending: boolean;
  statusLabel?: string | null;
  error?: string | null;
  accept: string;
  maxLabel: string;
  onTyping?: () => void;
}

/**
 * Message composer: multiline text, image selection with local preview only.
 * Nothing is uploaded until the patient presses send and accepts the consent
 * notice, which the page owns.
 */
export function ChatComposer({
  value,
  onChange,
  attachments,
  onFilesSelected,
  onRemoveAttachment,
  onSend,
  isSending,
  statusLabel,
  error,
  accept,
  maxLabel,
  onTyping,
}: ChatComposerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isSending;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="bg-card sticky bottom-0 space-y-2 border-t px-3 py-3 sm:px-4">
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Attached images">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="relative">
              <img
                src={attachment.previewUrl}
                alt={`Preview of ${attachment.file.name}`}
                className="border-border size-16 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                aria-label={`Remove ${attachment.file.name}`}
                className="bg-foreground/80 text-background absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          onFilesSelected(event.dataTransfer.files);
        }}
        className={cn(
          "border-input focus-within:border-ring focus-within:ring-ring/40 flex items-end gap-1 rounded-xl border bg-transparent p-1.5 focus-within:ring-2",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        <label
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 cursor-pointer items-center justify-center rounded-lg"
          title={`Attach an image (${maxLabel})`}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          <span className="sr-only">Attach an image</span>
          <input
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            disabled={isSending}
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.target.value = "";
            }}
          />
        </label>

        <Textarea
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Describe your symptoms, e.g. “I have had a headache for three days and feel dizzy.”"
          aria-label="Message the AI Health Assistant"
          className="max-h-36 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
          disabled={isSending}
        />

        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-1 text-[11px]">
        <span>
          Enter sends · Shift + Enter adds a line · Images: JPG, PNG, WebP up to {maxLabel}
        </span>
        {statusLabel && (
          <span role="status" className="text-primary flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}
