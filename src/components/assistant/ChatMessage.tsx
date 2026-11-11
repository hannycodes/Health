import { useEffect, useState } from "react";
import { ImageOff, Square, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AIChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { URGENCY_META } from "./urgency";

/** Lets one reply take over playback from another. */
const SPEAK_EVENT = "myhealth:speak-reply";

interface ChatMessageProps {
  message: AIChatMessage;
  onFollowUp?: (question: string) => void;
  followUpsDisabled?: boolean;
}

function formatClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ChatMessage({ message, onFollowUp, followUpsDisabled }: ChatMessageProps) {
  const isPatient = message.role === "PATIENT";
  const urgency = message.urgency ? URGENCY_META[message.urgency] : null;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const canSpeak =
    !isPatient &&
    message.content.length > 0 &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window;

  useEffect(() => {
    function stopForOtherReply(event: Event) {
      if ((event as CustomEvent<string>).detail !== message.id) setIsSpeaking(false);
    }
    window.addEventListener(SPEAK_EVENT, stopForOtherReply);
    return () => window.removeEventListener(SPEAK_EVENT, stopForOtherReply);
  }, [message.id]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel();
    const amharic = /[\u1200-\u137F]/.test(message.content);
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = amharic ? "am-ET" : "en-US";
    // Prefer an installed voice for the reply's language; fall back to the
    // engine default when the device has none.
    const voice = synth
      .getVoices()
      .find((candidate) => candidate.lang.toLowerCase().startsWith(amharic ? "am" : "en"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.dispatchEvent(new CustomEvent(SPEAK_EVENT, { detail: message.id }));
    setIsSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <li className={cn("flex gap-2.5", isPatient ? "justify-end" : "justify-start")}>
      {!isPatient && (
        <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
          <span aria-hidden="true" className="text-xs font-semibold">
            MH
          </span>
        </span>
      )}

      <div className={cn("max-w-[85%] space-y-2 sm:max-w-[75%]", isPatient && "items-end")}>
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            isPatient
              ? "bg-primary text-primary-foreground border-primary rounded-br-sm"
              : "bg-card rounded-bl-sm",
          )}
        >
          {message.content ? (
            <p className="whitespace-pre-line break-words">{message.content}</p>
          ) : (
            <p className="text-muted-foreground italic">Image only</p>
          )}

          {message.attachments.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((attachment) => (
                <li key={attachment.id}>
                  {attachment.previewUrl ? (
                    <img
                      src={attachment.previewUrl}
                      alt={`Attached symptom image: ${attachment.fileName}`}
                      className="size-24 rounded-lg border object-cover"
                    />
                  ) : (
                    <span className="bg-muted text-muted-foreground flex size-24 flex-col items-center justify-center gap-1 rounded-lg border text-center text-[10px]">
                      <ImageOff className="size-4" aria-hidden="true" />
                      {attachment.fileName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isPatient && urgency && (
          <div
            className={cn(
              "space-y-1 rounded-xl border px-3 py-2 text-xs",
              urgency.container,
            )}
          >
            <p className={cn("w-fit rounded-full border px-2 py-0.5 font-semibold", urgency.badge)}>
              {urgency.label}
            </p>
            <p>{urgency.hint}</p>
          </div>
        )}

        {!isPatient && message.recommendations && message.recommendations.length > 0 && (
          <div className="bg-muted/60 rounded-xl px-3 py-2 text-xs">
            <p className="mb-1 font-semibold">Suggested next steps</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {message.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {!isPatient && onFollowUp && message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.followUpQuestions.map((question) => (
              <Button
                key={question}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto max-w-full py-1 text-left text-xs font-normal whitespace-normal"
                disabled={followUpsDisabled}
                onClick={() => onFollowUp(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        )}

        {!isPatient && message.recommendedDoctorIds && message.recommendedDoctorIds.length > 0 && (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
            <Link to="/patient/doctors">Find a recommended specialist</Link>
          </Button>
        )}

        {!isPatient && message.disclaimer && (
          <p className="text-muted-foreground text-[11px]">{message.disclaimer}</p>
        )}

        <div
          className={cn(
            "text-muted-foreground flex items-center gap-2 text-[11px]",
            isPatient && "justify-end",
          )}
        >
          <span>{formatClock(message.createdAt)}</span>
          {canSpeak && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground -my-1 size-6"
              onClick={toggleSpeech}
              aria-label={isSpeaking ? "Stop reading the reply" : "Read the reply aloud"}
              aria-pressed={isSpeaking}
            >
              {isSpeaking ? (
                <Square className="size-3" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3" aria-hidden="true" />
              )}
            </Button>
          )}
          {message.isMock && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              Offline sample — not AI
            </Badge>
          )}
        </div>
      </div>
    </li>
  );
}
