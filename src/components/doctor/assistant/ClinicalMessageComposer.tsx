import { useRef, useState } from "react";
import { ImageIcon, Loader2, Mic, Paperclip, Send, Square, X } from "lucide-react";

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
import type { AiLanguage } from "@/features/doctor/services/aiGateway";
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  DOCTOR_AI_TASKS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  type ClinicalAttachment,
  type DoctorAITask,
} from "@/features/doctor/services/clinicalAssistantService";

interface ClinicalMessageComposerProps {
  text: string;
  onTextChange: (text: string) => void;
  task: DoctorAITask;
  onTaskChange: (task: DoctorAITask) => void;
  language: AiLanguage;
  onLanguageChange: (language: AiLanguage) => void;
  attachments: ClinicalAttachment[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
  onVoiceRecorded: (audio: Blob) => void;
  onVoiceError: (message: string) => void;
  isSending: boolean;
  isUploading: boolean;
  isTranscribing: boolean;
  uploadError: string | null;
  onClearUploadError: () => void;
  disabled?: boolean;
}

/** Clinical composer: text, task, language, voice recording and attachments. */
export function ClinicalMessageComposer({
  text,
  onTextChange,
  task,
  onTaskChange,
  language,
  onLanguageChange,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  onSend,
  onVoiceRecorded,
  onVoiceError,
  isSending,
  isUploading,
  isTranscribing,
  uploadError,
  onClearUploadError,
  disabled,
}: ClinicalMessageComposerProps) {
  const imageInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const atLimit = attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE;
  const busy = isSending || isUploading || isTranscribing || disabled;

  function submit() {
    if (!text.trim() || busy) return;
    onSend();
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onVoiceError("This browser does not expose microphone recording.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      onVoiceError("This browser cannot record audio (MediaRecorder unavailable).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const instance = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);

      chunks.current = [];
      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      instance.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: instance.mimeType || "audio/webm" });
        setIsRecording(false);
        if (blob.size === 0) {
          onVoiceError("The recording was empty. Try again.");
          return;
        }
        onVoiceRecorded(blob);
      };

      instance.start();
      recorder.current = instance;
      setIsRecording(true);
    } catch {
      onVoiceError("Microphone access was blocked. Allow it in the browser and retry.");
    }
  }

  function stopRecording() {
    recorder.current?.stop();
    recorder.current = null;
  }

  return (
    <div className="bg-card space-y-3 rounded-xl border p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
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

        <div className="space-y-1.5">
          <Label htmlFor="assistant-language">Language</Label>
          <Select
            value={language}
            onValueChange={(value) => onLanguageChange(value as AiLanguage)}
          >
            <SelectTrigger id="assistant-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {DOCTOR_AI_TASKS.find((item) => item.value === task)?.hint}
      </p>

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
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={3}
        aria-label="Message the clinical assistant"
        placeholder="Describe what you need, dictate it, or paste the notes you want organized."
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
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            disabled={atLimit || isUploading || isTranscribing || disabled}
            onClick={() => (isRecording ? stopRecording() : void startRecording())}
          >
            {isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
            {isRecording ? "Stop" : "Voice"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={atLimit || isUploading || isTranscribing || disabled}
            onClick={() => imageInput.current?.click()}
          >
            <ImageIcon className="size-4" />
            Image
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={atLimit || isUploading || isTranscribing || disabled}
            onClick={() => documentInput.current?.click()}
          >
            <Paperclip className="size-4" />
            Document
          </Button>

          {(isUploading || isTranscribing) && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              {isTranscribing ? "Transcribing…" : "Uploading…"}
            </span>
          )}
        </div>

        <Button onClick={submit} disabled={!text.trim() || busy}>
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send
        </Button>
      </div>

      <p className="text-muted-foreground text-[11px]">
        Voice, PNG, JPEG, WebP, PDF and plain text. Speech is transcribed by the server-side
        model in the selected language; DICOM and other specialised imaging formats are not
        supported.
      </p>
    </div>
  );
}
