import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Mic, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PendingAttachment } from "@/components/assistant/types";
import { cn } from "@/lib/utils";

interface SpeechRecognitionResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechConstructor = new () => SpeechRecognitionLike;

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
  language: "en" | "am";
  onLanguageChange: (language: "en" | "am") => void;
}

/**
 * Message composer: multiline text, image selection (local preview only),
 * Amharic/English reply language and browser voice dictation. Nothing is
 * uploaded until the patient sends and accepts the consent notice.
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
  language,
  onLanguageChange,
}: ChatComposerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isSending;
  const speechConstructor: SpeechConstructor | undefined =
    typeof window === "undefined"
      ? undefined
      : ((
          window as unknown as {
            SpeechRecognition?: SpeechConstructor;
            webkitSpeechRecognition?: SpeechConstructor;
          }
        ).SpeechRecognition ??
        (
          window as unknown as {
            webkitSpeechRecognition?: SpeechConstructor;
          }
        ).webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function toggleDictation() {
    if (!speechConstructor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new speechConstructor();
    recognition.lang = language === "am" ? "am-ET" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }
      const next = `${valueRef.current} ${transcript}`.trim();
      valueRef.current = next;
      onChange(next);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

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
        <select
          aria-label="Reply language"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as "en" | "am")}
          disabled={isSending}
          className="border-input bg-background text-foreground mb-1 h-7 shrink-0 rounded-md border px-1.5 text-[11px]"
        >
          <option value="en">EN</option>
          <option value="am">አማ</option>
        </select>

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

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={toggleDictation}
          disabled={!speechConstructor || isSending}
          aria-label={isListening ? "Stop voice input" : "Dictate a message"}
          aria-pressed={isListening}
          className={cn("text-muted-foreground", isListening && "text-primary bg-primary/10")}
        >
          <Mic className="size-4" aria-hidden="true" />
        </Button>

        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Describe your symptoms, e.g. “I have had a headache for three days and feel dizzy.” / “ለሦስት ቀናት ራስ ምታት እና ማዞር አለብኝ።”"
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
          Enter sends · Shift + Enter adds a line · JPG, PNG or WebP up to {maxLabel}
          {!speechConstructor && " · Voice input is not supported in this browser"}
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
