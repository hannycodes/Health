import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, MessageSquarePlus, ShieldCheck } from "lucide-react";

import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { ClinicalChatWindow } from "@/components/doctor/assistant/ClinicalChatWindow";
import { ClinicalMessageComposer } from "@/components/doctor/assistant/ClinicalMessageComposer";
import { PatientContextPanel } from "@/components/doctor/assistant/PatientContextPanel";
import { PatientContextSelector } from "@/components/doctor/assistant/PatientContextSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clinicalAssistantService,
  classifyFile,
  MAX_ATTACHMENTS_PER_MESSAGE,
  type ClinicalAttachment,
  type ClinicalConversation,
  type ClinicalMessage,
  type DoctorAIResponse,
  type DoctorAITask,
} from "@/features/doctor/services/clinicalAssistantService";
import {
  fetchAiStatus,
  transcribeAudio,
  type AiLanguage,
} from "@/features/doctor/services/aiGateway";
import { useDoctorWorkspace } from "@/features/doctor/hooks/useDoctorWorkspace";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";

export function DoctorAssistantPage() {
  const [searchParams] = useSearchParams();
  const { doctorId, doctor, patients, isLoading } = useDoctorWorkspace();

  const initialPatientId = searchParams.get("patientId") ?? undefined;
  const [patientId, setPatientId] = useState<string | undefined>(initialPatientId);
  const [task, setTask] = useState<DoctorAITask>("GENERAL_QUESTION");
  const [language, setLanguage] = useState<AiLanguage>("en");
  const [text, setText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [conversation, setConversation] = useState<ClinicalConversation | null>(null);
  const [conversations, setConversations] = useState<ClinicalConversation[]>([]);
  const [attachments, setAttachments] = useState<ClinicalAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [approving, setApproving] = useState<DoctorAIResponse | null>(null);
  const [recordTitle, setRecordTitle] = useState("AI-assisted summary");
  const [isApproving, setIsApproving] = useState(false);

  const selectedPatient = patients.find((patient) => patient.id === patientId);
  const patientRecords = useServiceQuery(
    () => (patientId ? services.medicalRecords.listByPatient(patientId) : Promise.resolve([])),
    patientId ?? "",
  );
  const aiStatus = useServiceQuery(() => fetchAiStatus(), "ai-status");

  function refreshConversations() {
    if (doctorId) setConversations(clinicalAssistantService.listConversations(doctorId));
  }

  function startConversation() {
    if (!doctorId) return;
    const next = clinicalAssistantService.createConversation(doctorId, patientId);
    setConversation(next);
    setSendError(null);
    refreshConversations();
  }

  function openConversation(next: ClinicalConversation) {
    setConversation(next);
    setPatientId(next.patientId);
    setSendError(null);
  }

  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const room = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
    const selected = Array.from(files).slice(0, Math.max(room, 0));

    if (selected.length < files.length) {
      setUploadError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
    }

    for (const file of selected) {
      const validation = classifyFile(file);
      if (!validation.ok) {
        setUploadError(validation.error);
        continue;
      }

      setIsUploading(true);
      try {
        const uploaded = await clinicalAssistantService.uploadAttachment(file);
        setAttachments((current) => [...current, uploaded]);
      } catch (error) {
        setUploadError(getApiErrorMessage(error));
      } finally {
        setIsUploading(false);
      }
    }
  }

  function removeAttachment(id: string) {
    clinicalAssistantService.discardAttachment(id);
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  async function send(message: string) {
    const body = message.trim();
    if (!doctorId || !body) return;
    setIsSending(true);
    setSendError(null);

    try {
      const result = await clinicalAssistantService.send(doctorId, {
        conversationId: conversation?.id,
        message: body,
        patientId,
        task,
        language,
        attachmentIds: attachments.map((item) => item.id),
      });
      setConversation(result.conversation);
      setAttachments([]);
      setText("");
      refreshConversations();
    } catch (error) {
      setSendError(getApiErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  /** Voice message → text, transcribed server-side in the selected language. */
  async function handleVoiceRecorded(audio: Blob) {
    setIsTranscribing(true);
    setUploadError(null);
    try {
      const result = await transcribeAudio(audio, language);
      if (!result.text.trim()) {
        setUploadError("No speech was recognised in that recording.");
        return;
      }
      setText((current) => (current ? `${current}\n${result.text}` : result.text));
      toast.success("Voice message transcribed. Review it before sending.");
    } catch (error) {
      setUploadError(getApiErrorMessage(error));
    } finally {
      setIsTranscribing(false);
    }
  }

  async function approveAndSave() {
    if (!approving?.generatedSummary || !doctorId || !patientId || !doctor) return;
    if (!recordTitle.trim()) {
      toast.error("Give the record a short title before saving.");
      return;
    }

    setIsApproving(true);
    try {
      await services.medicalRecords.create({
        patientId,
        doctorId,
        hospitalId: doctor.hospitalId,
        diagnosis: recordTitle.trim(),
        treatment: "AI-assisted summary reviewed and approved by the clinician.",
        prescription: [],
        notes: approving.generatedSummary,
      });
      toast.success("Summary saved as a clinical record.");
      setApproving(null);
      patientRecords.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsApproving(false);
    }
  }

  function renderResponseActions(message: ClinicalMessage) {
    const response = message.response;
    if (!response?.generatedSummary) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(response?.message ?? message.content);
            toast.success("Response copied.");
          }}
        >
          Copy response
        </Button>
      );
    }

    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(response.generatedSummary ?? "");
            toast.success("Summary copied to the clipboard.");
          }}
        >
          Copy summary
        </Button>
        {patientId && (
          <Button size="sm" onClick={() => setApproving(response)}>
            Review and save as record
          </Button>
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Clinical Assistant" description="Loading the assistant…" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Clinical Assistant"
        description="Decision support for reviewing records, organizing notes and preparing documentation. Every response requires your review."
        breadcrumbs={[{ label: "Doctor", to: "/doctor" }, { label: "AI Assistant" }]}
        actions={
          <>
            {aiStatus.data?.configured ? (
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-800"
              >
                Live model · {aiStatus.data.chatModel ?? "connected"} · vision + voice
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                Demo adapter — set AI_API_KEY and run npm run dev:ai for live analysis
              </Badge>
            )}
            <Button variant="outline" onClick={startConversation}>
              <MessageSquarePlus className="size-4" />
              New conversation
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {sendError && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <AlertTriangle className="text-destructive mt-0.5 size-4" aria-hidden="true" />
              {sendError}
            </div>
          )}

          <ClinicalChatWindow
            messages={conversation?.messages ?? []}
            isSending={isSending}
            patientId={patientId}
            renderActions={renderResponseActions}
            onSelectPrompt={(prompt) => void send(prompt)}
          />

          {approving && (
            <Card className="border-primary/40">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm">Approve this AI summary as a record</CardTitle>
                <p className="text-muted-foreground text-xs">
                  This creates a new record authored by you. Existing records are never
                  modified, and nothing is saved without this confirmation.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="approve-title">Record title</Label>
                  <Input
                    id="approve-title"
                    value={recordTitle}
                    onChange={(event) => setRecordTitle(event.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void approveAndSave()} disabled={isApproving}>
                    Approve and save
                  </Button>
                  <Button variant="outline" onClick={() => setApproving(null)}>
                    Discard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <ClinicalMessageComposer
            text={text}
            onTextChange={setText}
            task={task}
            onTaskChange={setTask}
            language={language}
            onLanguageChange={setLanguage}
            attachments={attachments}
            onAddFiles={(files) => void handleAddFiles(files)}
            onRemoveAttachment={removeAttachment}
            onSend={() => void send(text)}
            onVoiceRecorded={(audio) => void handleVoiceRecorded(audio)}
            onVoiceError={setUploadError}
            isSending={isSending}
            isUploading={isUploading}
            isTranscribing={isTranscribing}
            uploadError={uploadError}
            onClearUploadError={() => setUploadError(null)}
            disabled={!doctorId}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Patient context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PatientContextSelector
                patients={patients}
                selectedPatientId={patientId}
                onChange={(next) => {
                  setPatientId(next);
                  if (next && conversation) {
                    setConversation({ ...conversation, patientId: next });
                  }
                }}
              />
              {selectedPatient && (
                <PatientContextPanel
                  patient={selectedPatient}
                  records={patientRecords.data ?? []}
                  onClear={() => setPatientId(undefined)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Conversations started in this session appear here. They are kept in
                  memory only, never in browser storage.
                </p>
              ) : (
                conversations.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openConversation(item)}
                    className="hover:bg-accent block w-full rounded-md border px-2.5 py-2 text-left text-xs"
                  >
                    <span className="line-clamp-2 font-medium">{item.title}</span>
                    <span className="text-muted-foreground mt-0.5 block">
                      {item.messages.length} message(s)
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="text-primary size-4" aria-hidden="true" />
                Clinical safety
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-xs">
              <p>The assistant does not diagnose, prescribe or write to records on its own.</p>
              <p>
                Images are sent to the vision model. Documents are listed but not parsed, so
                their contents are not read.
              </p>
              <p>Only patients in your care can be selected, and access is re-checked on send.</p>
              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                <Link to="/doctor/patients">Review authorized patients</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
