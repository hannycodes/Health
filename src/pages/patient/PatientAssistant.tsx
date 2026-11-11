import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ChatComposer } from "@/components/assistant/ChatComposer";
import { ChatMessage } from "@/components/assistant/ChatMessage";
import { ImageConsentDialog } from "@/components/assistant/ImageConsentDialog";
import { URGENCY_META } from "@/components/assistant/urgency";
import type { PendingAttachment } from "@/components/assistant/types";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import { formatDate } from "@/utils/format";
import { toPatientHealthContext } from "@/utils/health";

const MAX_IMAGE_MB = Number(import.meta.env.VITE_AI_IMAGE_MAX_MB ?? 5) || 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ATTACHMENTS = 3;

const STARTER_PROMPTS = [
  "I have had a headache for three days and feel dizzy.",
  "I have an itchy rash on both arms.",
  "I have a fever and cough that started three days ago.",
];

function validateImage(file: File) {
  if (!ACCEPTED_IMAGES.includes(file.type)) {
    return `${file.name}: only JPG, PNG or WebP images are supported.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: images must be smaller than ${MAX_IMAGE_MB} MB.`;
  }
  return null;
}

export function PatientAssistant() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";

  const patientQuery = useServiceQuery(
    () => services.patients.getByUserId(patientId),
    patientId,
  );
  const conversationsQuery = useServiceQuery(
    () => services.aiHealth.listConversations(patientId),
    patientId,
  );

  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationQuery = useServiceQuery(
    () =>
      conversationId
        ? services.aiHealth.getConversation(conversationId)
        : Promise.resolve(null),
    conversationId ?? "new",
  );

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversationQuery.data?.messages ?? [];
  const patientContext = useMemo(
    () => toPatientHealthContext(patientQuery.data),
    [patientQuery.data],
  );
  const conversations = conversationsQuery.data ?? [];

  const lastAssistant = [...messages].reverse().find((message) => message.role === "ASSISTANT");
  const emergencyActive = lastAssistant?.urgency === "EMERGENCY";

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, isSending]);

  function revoke(attachment: PendingAttachment) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  }

  function clearAttachments() {
    setAttachments((current) => {
      current.forEach(revoke);
      return [];
    });
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;

    const accepted: PendingAttachment[] = [];
    const problems: string[] = [];

    Array.from(files).forEach((file) => {
      if (attachments.length + accepted.length >= MAX_ATTACHMENTS) {
        problems.push(`You can attach up to ${MAX_ATTACHMENTS} images per message.`);
        return;
      }
      const problem = validateImage(file);
      if (problem) {
        problems.push(problem);
        return;
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (problems.length > 0) {
      setError(problems[0]);
      toast.error(problems[0]);
    } else {
      setError(null);
    }

    if (accepted.length === 0) return;
    setAttachments((current) => [...current, ...accepted]);
    if (!consentGranted) setConsentFile(accepted[0].file);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target) revoke(target);
      return current.filter((item) => item.id !== id);
    });
  }

  function startNewConversation() {
    setConversationId(null);
    setDraft("");
    setError(null);
    clearAttachments();
  }

  async function handleSend() {
    const message = draft.trim();
    if (!message && attachments.length === 0) return;

    if (attachments.length > 0 && !consentGranted) {
      setConsentFile(attachments[0].file);
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const imageIds: string[] = [];
      for (const attachment of attachments) {
        setStatus("Uploading image…");
        const uploaded = await services.aiHealth.uploadImage(attachment.file);
        imageIds.push(uploaded.id);
      }

      setStatus(
        imageIds.length > 0 ? "Reviewing your message…" : "Waiting for the assistant…",
      );

      const response = await services.aiHealth.sendMessage({
        conversationId: conversationId ?? undefined,
        patientId,
        message,
        patientContext,
        imageIds,
      });

      if (!conversationId) setConversationId(response.conversationId);
      setDraft("");
      clearAttachments();
    } catch (sendError) {
      const messageText = getApiErrorMessage(sendError);
      setError(
        `${messageText} The assistant is unavailable right now — for urgent symptoms contact emergency services or your doctor directly.`,
      );
      toast.error(messageText);
    } finally {
      setIsSending(false);
      setStatus(null);
    }
  }

  const loading =
    patientQuery.isLoading || (Boolean(conversationId) && conversationQuery.isLoading);
  const loadError = patientQuery.error ?? conversationQuery.error;

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Health Assistant"
        description="Describe your symptoms, ask follow-up questions and attach a symptom photo. You will get general guidance and suggested next steps — never a diagnosis."
        breadcrumbs={[{ label: "Patient", to: "/patient" }, { label: "AI Health Assistant" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Demo assistant · rule-based
            </Badge>
            <Button variant="outline" onClick={startNewConversation}>
              <Plus className="size-4" aria-hidden="true" />
              New conversation
            </Button>
          </div>
        }
      />

      <Card className="border-amber-200 bg-amber-50/70 py-3">
        <CardContent className="flex items-start gap-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            This demo answers with local keyword rules, not a medical AI model. It cannot
            diagnose, prescribe or rule out an emergency. For severe chest pain, trouble
            breathing or signs of stroke, call your local emergency number now.
          </p>
        </CardContent>
      </Card>

      {loadError ? (
        <ErrorState
          message={loadError}
          onRetry={() => {
            patientQuery.refetch();
            conversationQuery.refetch();
          }}
        />
      ) : loading ? (
        <LoadingSpinner label="Loading your conversation" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-2">
            <div className="lg:hidden">
              <Select
                value={conversationId ?? "new"}
                onValueChange={(value) => setConversationId(value === "new" ? null : value)}
              >
                <SelectTrigger aria-label="Conversation history">
                  <SelectValue placeholder="New conversation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New conversation</SelectItem>
                  {conversations.map((conversation) => (
                    <SelectItem key={conversation.id} value={conversation.id}>
                      {conversation.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="hidden gap-2 py-3 lg:flex">
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Previous conversations
                </p>
                {conversations.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No saved conversations yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {conversations.map((conversation) => (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => setConversationId(conversation.id)}
                          aria-current={conversationId === conversation.id ? "true" : undefined}
                          className={`hover:bg-accent w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                            conversationId === conversation.id ? "bg-secondary" : ""
                          }`}
                        >
                          <span className="block truncate font-medium">{conversation.title}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {formatDate(conversation.updatedAt.slice(0, 10))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="gap-2 py-3">
              <CardContent className="space-y-1.5 text-xs">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  What the assistant knows
                </p>
                {Object.keys(patientContext).length === 0 ? (
                  <p className="text-muted-foreground">
                    No profile details yet. Complete your health profile so replies can
                    include relevant context.
                  </p>
                ) : (
                  <ul className="text-muted-foreground space-y-0.5">
                    {patientContext.age !== undefined && <li>Age: {patientContext.age}</li>}
                    {patientContext.weightKg !== undefined && (
                      <li>Weight: {patientContext.weightKg} kg</li>
                    )}
                    {patientContext.heightCm !== undefined && (
                      <li>Height: {patientContext.heightCm} cm</li>
                    )}
                    {patientContext.allergies && (
                      <li>Allergies: {patientContext.allergies.join(", ")}</li>
                    )}
                    {patientContext.conditions && (
                      <li>Conditions: {patientContext.conditions.join(", ")}</li>
                    )}
                    {patientContext.medications && (
                      <li>Medications: {patientContext.medications.join(", ")}</li>
                    )}
                  </ul>
                )}
                <p className="text-muted-foreground text-[11px]">
                  Only the fields you have saved are sent. Missing details stay missing.
                </p>
              </CardContent>
            </Card>
          </aside>

          <Card className="flex h-[min(70vh,42rem)] flex-col gap-0 overflow-hidden py-0">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {conversationQuery.data?.title ?? "New conversation"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Informational guidance only · not a diagnosis
                  </p>
                </div>
              </div>
            </div>

            {emergencyActive && (
              <div
                role="alert"
                className={`flex items-start gap-2 border-b px-4 py-2.5 text-xs ${URGENCY_META.EMERGENCY.container}`}
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  <span className="font-semibold">Emergency guidance: </span>
                  call your local emergency number or go to the nearest emergency
                  department now. Do not wait for an appointment.
                </p>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-sm space-y-3 py-8 text-center">
                  <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                    <Sparkles className="size-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">How are you feeling today?</p>
                    <p className="text-muted-foreground text-xs">
                      Describe what you are experiencing, how long it has lasted and
                      anything that makes it worse. You can add a symptom photo.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {STARTER_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-1 text-left text-[11px] font-normal whitespace-normal"
                        onClick={() => setDraft(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onFollowUp={(question) => setDraft(question)}
                      followUpsDisabled={isSending}
                    />
                  ))}
                  {isSending && (
                    <li className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full">
                        <Sparkles className="size-3.5 animate-pulse" aria-hidden="true" />
                      </span>
                      <span role="status">{status ?? "Thinking…"}</span>
                    </li>
                  )}
                </ul>
              )}
            </div>

            <ChatComposer
              value={draft}
              onChange={setDraft}
              attachments={attachments}
              onFilesSelected={handleFilesSelected}
              onRemoveAttachment={removeAttachment}
              onSend={() => void handleSend()}
              isSending={isSending}
              statusLabel={status}
              error={error}
              accept={ACCEPTED_IMAGES.join(",")}
              maxLabel={`${MAX_IMAGE_MB} MB`}
            />
          </Card>
        </div>
      )}

      <ImageConsentDialog
        open={consentFile !== null}
        fileName={consentFile?.name ?? ""}
        onConsent={() => {
          setConsentGranted(true);
          setConsentFile(null);
        }}
        onDecline={() => {
          clearAttachments();
          setConsentFile(null);
          setError("Image removed. You can attach a different image at any time.");
        }}
      />
    </div>
  );
}
