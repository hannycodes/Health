import { useRef, useState } from "react";
import { ImageIcon, Loader2, Paperclip, Send, X } from "lucide-react";

import { ClinicalAttachmentPreview } from "./ClinicalAttachmentPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  DOCTOR_AI_TASKS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  type ClinicalAttachment,
  type DoctorAITask,
} from "@/features/doctor/services/clinicalAssistantService";

interface ClinicalMessageComposerProps {
  task: DoctorAITask;
  onTaskChange: (task: DoctorAITask) => void;
  attachments: ClinicalAttachment[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: (text: string) => void;
  isSending: boolean;
  isUploading: boolean;
  uploadError: string | null;
  onClearUploadError: () => void;
  disabled?: boolean;
}

/** Clinical composer: text, task type, image and document attachments. */
export function ClinicalMessageComposer({
  task,
  onTaskChange,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  onSend,
  isSending,
  isUploading,
  uploadError,
  onClearUploadError,
  disabled,
}: ClinicalMessageComposerProps) {
  const [text, setText] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);

  const atLimit = attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE;

  function submit() {
    if (!text.trim() || isSending || disabled) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="bg-card space-y-3 rounded-xl border p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="assistant-task">Task</Label>
          <Select value={task} onValueChange={(value) => onTaskChange(value as DoctorAITask)}>
            <SelectTrigger id="assistant-task">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCTOR_AI_TASKS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground hidden max-w-[16rem] text-xs sm:block">
          {DOCTOR_AI_TASKS.find((item) => item.value === task)?.hint}
        </p>
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <ClinicalAttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onRemoveAttachment(attachment.id)}
            />
          ))}
        </div>
      )}

      {uploadError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
        >
          <span>{uploadError}</span>
          <button
            type="button"
            aria-label="Dismiss upload error"
            onClick={onClearUploadError}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={3}
        aria-label="Message the clinical assistant"
        placeholder="Describe what you need, or paste the notes you want organized."
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <input
            ref={imageInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(event) => {
              onAddFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={documentInput}
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(event) => {
              onAddFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={atLimit || isUploading || disabled}
            onClick={() => imageInput.current?.click()}
          >
            <ImageIcon className="size-4" />
            Image
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={atLimit || isUploading || disabled}
            onClick={() => documentInput.current?.click()}
          >
            <Paperclip className="size-4" />
            Document
          </Button>
          {isUploading && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              Uploading…
            </span>
          )}
        </div>

        <Button onClick={submit} disabled={!text.trim() || isSending || disabled}>
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send
        </Button>
      </div>

      <p className="text-muted-foreground text-[11px]">
        PNG, JPEG, WebP, PDF and plain text only. DICOM and other specialised imaging
        formats are not supported.
      </p>
    </div>
  );
}
