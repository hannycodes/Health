import { ApiError } from "@/lib/http";
import { services } from "@/services";
import type { MedicalRecord, Patient } from "@/types";
import { formatDateTime } from "@/utils/format";
import { isAuthorizedForPatient } from "./doctorAccess";

/**
 * Doctor Clinical Assistant — MOCK ADAPTER.
 *
 * This is a demonstration adapter. It calls no AI provider, reads no pixels
 * from images and extracts no text from documents. Every response it produces
 * is derived from records the mock service layer already holds, is labelled as
 * demonstration output, and is flagged `requiresDoctorReview`.
 *
 * The shared AI service is owned by the AI integration owner. The shapes below
 * are the contract the Doctor Portal needs; replace `clinicalAssistantService`
 * with the shared implementation once `DoctorAIRequest`/`DoctorAIResponse` are
 * published, without touching these components.
 */

export type DoctorAITask =
  | "GENERAL_QUESTION"
  | "PATIENT_HISTORY_SUMMARY"
  | "IMAGE_ASSISTANCE"
  | "DOCUMENT_SUMMARY"
  | "CLINICAL_NOTE_ASSISTANCE"
  | "RESULT_COMPARISON";

export const DOCTOR_AI_TASKS: Array<{ value: DoctorAITask; label: string; hint: string }> = [
  {
    value: "GENERAL_QUESTION",
    label: "General clinical question",
    hint: "Ask about available information without a specific patient.",
  },
  {
    value: "PATIENT_HISTORY_SUMMARY",
    label: "Patient history summary",
    hint: "Summarize the selected patient's authorized records.",
  },
  {
    value: "CLINICAL_NOTE_ASSISTANCE",
    label: "Organize clinical notes",
    hint: "Restructure rough notes without adding findings.",
  },
  {
    value: "DOCUMENT_SUMMARY",
    label: "Document summary",
    hint: "Organize an uploaded document (metadata only in this demo).",
  },
  {
    value: "IMAGE_ASSISTANCE",
    label: "Image observation",
    hint: "Describe an uploaded clinical photograph (metadata only in this demo).",
  },
  {
    value: "RESULT_COMPARISON",
    label: "Compare records",
    hint: "Compare recorded visits without inferring trends.",
  },
];

export interface DoctorAIRequest {
  conversationId?: string;
  message: string;
  patientId?: string;
  task: DoctorAITask;
  attachmentIds?: string[];
}

export interface DoctorAISourceRecord {
  recordId: string;
  title: string;
  date?: string;
}

export interface DoctorAIResponse {
  conversationId: string;
  message: string;
  task?: DoctorAITask;
  generatedSummary?: string;
  observations?: string[];
  followUpQuestions?: string[];
  limitations?: string[];
  sourceRecords?: DoctorAISourceRecord[];
  requiresDoctorReview: boolean;
  /** True for this mock adapter; the shared service will return false. */
  isDemo: boolean;
}

export type ClinicalAttachmentKind = "image" | "document";

export interface ClinicalAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: ClinicalAttachmentKind;
  /** In-memory object URL / data URL. Never persisted or uploaded publicly. */
  previewUrl?: string;
  uploadedAt: string;
}

export interface ClinicalMessage {
  id: string;
  role: "DOCTOR" | "ASSISTANT";
  content: string;
  createdAt: string;
  attachments?: ClinicalAttachment[];
  response?: DoctorAIResponse;
}

export interface ClinicalConversation {
  id: string;
  doctorId: string;
  title: string;
  patientId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ClinicalMessage[];
}

/* -------------------------------------------------------------------------- */
/*                             Attachment validation                          */
/* -------------------------------------------------------------------------- */

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "text/plain"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;

export type FileValidation =
  | { ok: true; kind: ClinicalAttachmentKind }
  | { ok: false; error: string };

export function classifyFile(file: File): FileValidation {
  const type = file.type || "application/octet-stream";

  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Images must be 8 MB or smaller." };
    }
    return { ok: true, kind: "image" };
  }

  if ((ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(type)) {
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { ok: false, error: "Documents must be 12 MB or smaller." };
    }
    return { ok: true, kind: "document" };
  }

  if (type.startsWith("image/")) {
    return {
      ok: false,
      error: "Unsupported image format. Use PNG, JPEG or WebP.",
    };
  }

  return {
    ok: false,
    error:
      "Unsupported file type. This demo accepts PNG, JPEG, WebP, PDF and plain text. DICOM and other specialised imaging formats are not supported.",
  };
}

export function attachmentKindLabel(kind: ClinicalAttachmentKind) {
  return kind === "image" ? "Clinical image" : "Document";
}

/* -------------------------------------------------------------------------- */
/*                               In-memory store                              */
/* -------------------------------------------------------------------------- */

/**
 * Conversations and attachment previews live in memory only — never in
 * localStorage — so patient material is not left behind on a shared machine.
 * A reload clears the session, which is the intended privacy behaviour.
 */
const conversations: ClinicalConversation[] = [];
const attachments = new Map<string, ClinicalAttachment>();

let conversationSeq = 0;
let attachmentSeq = 0;
let messageSeq = 0;

function nextId(prefix: string, seq: number) {
  return `${prefix}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function readAsDataUrl(file: File): Promise<string | undefined> {
  if (typeof FileReader === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : resolve(undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------------------- */
/*                             Response composition                           */
/* -------------------------------------------------------------------------- */

const DEMO_NOTICE =
  "Demonstration output produced by the Doctor Portal mock adapter. No AI provider was called. Clinician review is required before any part of this is used in documentation.";

function demoLimitations(extra: string[] = []) {
  return [DEMO_NOTICE, ...extra];
}

function recordsToSources(records: MedicalRecord[], doctorNames: Map<string, string>) {
  return records.map<DoctorAISourceRecord>((record) => ({
    recordId: record.id,
    title: `${record.diagnosis || "Consultation record"} · ${doctorNames.get(record.doctorId) ?? "Unknown doctor"}`,
    date: record.recordedAt,
  }));
}

function section(title: string, lines: string[]) {
  return [`${title}`, ...lines.map((line) => `  • ${line}`)].join("\n");
}

async function buildHistorySummary(patientId: string) {
  const [patient, records, doctors, hospitals] = await Promise.all([
    services.patients.getById(patientId),
    services.medicalRecords.listByPatient(patientId),
    services.doctors.list(),
    services.hospitals.list(),
  ]);

  const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.fullName]));
  const hospitalNames = new Map(hospitals.map((hospital) => [hospital.id, hospital.name]));
  const ordered = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const overview = patient
    ? [
        `Name: ${patient.fullName}`,
        `Date of birth: ${patient.dateOfBirth ?? "not recorded"}`,
        `Blood type: ${patient.bloodType ?? "not recorded"}`,
        `Records available to you: ${ordered.length}`,
      ]
    : ["Patient record could not be read."];

  const visits = ordered.length
    ? ordered.map(
        (record) =>
          `${formatDateTime(record.recordedAt)} — ${doctorNames.get(record.doctorId) ?? "Unknown doctor"}${
            hospitalNames.has(record.hospitalId)
              ? `, ${hospitalNames.get(record.hospitalId)}`
              : ""
          }: ${record.diagnosis || "no diagnosis recorded"}`,
      )
    : ["No consultation records are stored for this patient."];

  const diagnoses = ordered
    .filter((record) => record.diagnosis.trim().length > 0)
    .map((record) => `${record.diagnosis} (${formatDateTime(record.recordedAt)})`);

  const treatments = ordered
    .filter((record) => record.treatment.trim().length > 0)
    .map((record) => `${record.treatment} (${formatDateTime(record.recordedAt)})`);

  const medications = Array.from(
    new Set(ordered.flatMap((record) => record.prescription)),
  );

  const summary = [
    "1. Patient overview",
    ...overview.map((line) => `  • ${line}`),
    "",
    "2. Previous consultations",
    ...visits.map((line) => `  • ${line}`),
    "",
    "3. Recorded diagnoses",
    ...(diagnoses.length ? diagnoses.map((line) => `  • ${line}`) : ["  • None recorded."]),
    "",
    "4. Known allergies",
    "  • Not recorded. The shared data model has no allergy field, so nothing is inferred here.",
    "",
    "5. Existing medical conditions",
    "  • Not recorded as a structured field. Review the recorded diagnoses above.",
    "",
    "6. Current medications",
    ...(medications.length
      ? medications.map((line) => `  • ${line}`)
      : ["  • None recorded."]),
    "",
    "7. Important laboratory findings",
    "  • No laboratory results are stored in the shared data model.",
    "",
    "8. Imaging and diagnostic reports",
    "  • No imaging reports or diagnostic documents are stored.",
    "",
    "9. Previous treatment plans",
    ...(treatments.length
      ? treatments.map((line) => `  • ${line}`)
      : ["  • None recorded."]),
    "",
    "10. Relevant changes over time",
    `  • ${ordered.length >= 2 ? `Records span ${formatDateTime(ordered[0].recordedAt)} to ${formatDateTime(ordered[ordered.length - 1].recordedAt)}. No clinical trend is asserted because comparable measurements are not recorded.` : "Insufficient records to compare over time."}`,
    "",
    "11. Missing or incomplete information",
    "  • Allergies, structured conditions, vitals, laboratory values and imaging are absent from the available records.",
    "  • Nothing above has been inferred or filled in by the assistant.",
    "",
    "AI interpretation (not part of the medical record):",
    ordered.length
      ? "  • The available records are consultation summaries only; they are a starting point for review, not a complete history."
      : "  • There is no recorded history to summarize for this patient.",
  ].join("\n");

  return {
    summary,
    records: ordered,
    doctorNames,
    followUpQuestions: [
      "Would you like the recorded treatment plans listed separately?",
      "Should I list which documentation fields are still missing for today's consultation?",
    ],
  };
}

function organizeNotes(raw: string) {
  const lines = raw
    .split(/\r?\n|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const complaint = lines[0] ?? "Not provided.";
  const reported = lines.slice(1);

  return [
    "Consultation note organization (your own text, restructured)",
    "",
    section("Main complaint", [complaint]),
    "",
    section(
      "Symptoms reported",
      reported.length ? reported : ["Nothing further was entered by the doctor."],
    ),
    "",
    section("Examination findings", [
      "Not provided — add examination findings before saving.",
    ]),
    "",
    section("Assessment", [
      "Not provided — the assistant does not generate a diagnosis.",
    ]),
    "",
    section("Plan", [
      "Not provided — add the treatment plan, follow-up and referrals.",
    ]),
    "",
    "Nothing was added to your text. Sections that you did not supply are marked as not provided.",
  ].join("\n");
}

function compareRecords(records: MedicalRecord[]) {
  const ordered = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const lines = ordered.map(
    (record, index) =>
      `${index + 1}. ${formatDateTime(record.recordedAt)} — ${record.diagnosis || "no diagnosis recorded"}${
        record.treatment ? ` · Treatment: ${record.treatment}` : ""
      }`,
  );

  return [
    "Recorded consultations available for comparison:",
    ...(lines.length ? lines.map((line) => `  • ${line}`) : ["  • None."]),
    "",
    "Comparison limits:",
    "  • Only diagnoses, treatments and prescriptions are stored; no numeric results, units or reference ranges exist to compare.",
    "  • No trend is asserted. Any change over time would need comparable measurements recorded at each visit.",
  ].join("\n");
}

function describeAttachments(list: ClinicalAttachment[]) {
  return list.map(
    (attachment) =>
      `${attachmentKindLabel(attachment.kind)}: ${attachment.name} (${attachment.mimeType || "unknown type"})`,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Service                                   */
/* -------------------------------------------------------------------------- */

export const clinicalAssistantService = {
  /** Conversations for one doctor, newest first. */
  listConversations(doctorId: string): ClinicalConversation[] {
    return conversations
      .filter((conversation) => conversation.doctorId === doctorId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getConversation(conversationId: string): ClinicalConversation | null {
    return conversations.find((item) => item.id === conversationId) ?? null;
  },

  createConversation(doctorId: string, patientId?: string): ClinicalConversation {
    const now = new Date().toISOString();
    const conversation: ClinicalConversation = {
      id: nextId("cnv", ++conversationSeq),
      doctorId,
      patientId,
      title: "New clinical conversation",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    conversations.unshift(conversation);
    return conversation;
  },

  deleteConversation(conversationId: string) {
    const index = conversations.findIndex((item) => item.id === conversationId);
    if (index >= 0) conversations.splice(index, 1);
  },

  async uploadAttachment(file: File): Promise<ClinicalAttachment> {
    const validation = classifyFile(file);
    if (!validation.ok) {
      throw new ApiError({ status: 415, message: validation.error });
    }

    await delay(220);

    const attachment: ClinicalAttachment = {
      id: nextId("att", ++attachmentSeq),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      kind: validation.kind,
      previewUrl: validation.kind === "image" ? await readAsDataUrl(file) : undefined,
      uploadedAt: new Date().toISOString(),
    };

    attachments.set(attachment.id, attachment);
    return attachment;
  },

  discardAttachment(attachmentId: string) {
    attachments.delete(attachmentId);
  },

  /**
   * Send a doctor message and produce a demonstration response.
   *
   * Patient access is re-checked here, not trusted from the caller, mirroring
   * the backend rule that a patient id in a request is never proof of access.
   */
  async send(doctorId: string, request: DoctorAIRequest): Promise<{
    conversation: ClinicalConversation;
    response: DoctorAIResponse;
  }> {
    const conversation =
      (request.conversationId && this.getConversation(request.conversationId)) ||
      this.createConversation(doctorId, request.patientId);

    if (conversation.doctorId !== doctorId) {
      throw new ApiError({ status: 403, message: "This conversation belongs to another clinician." });
    }

    if (request.patientId) {
      const allowed = await isAuthorizedForPatient(doctorId, request.patientId);
      if (!allowed) {
        throw new ApiError({
          status: 403,
          message: "You do not have an active care relationship with this patient.",
        });
      }
    }

    const usedAttachments = (request.attachmentIds ?? [])
      .map((id) => attachments.get(id))
      .filter((item): item is ClinicalAttachment => Boolean(item));

    const now = new Date().toISOString();
    const doctorMessage: ClinicalMessage = {
      id: nextId("msg", ++messageSeq),
      role: "DOCTOR",
      content: request.message,
      createdAt: now,
      attachments: usedAttachments.length ? usedAttachments : undefined,
    };

    await delay(700);

    const response = await this.composeResponse(request, conversation, usedAttachments);
    const assistantMessage: ClinicalMessage = {
      id: nextId("msg", ++messageSeq),
      role: "ASSISTANT",
      content: response.message,
      createdAt: new Date().toISOString(),
      response,
    };

    conversation.messages = [...conversation.messages, doctorMessage, assistantMessage];
    conversation.updatedAt = assistantMessage.createdAt;
    if (conversation.title === "New clinical conversation") {
      const source = request.message.trim() || request.task.replaceAll("_", " ").toLowerCase();
      conversation.title = source.length > 52 ? `${source.slice(0, 52)}…` : source;
    }
    if (request.patientId) conversation.patientId = request.patientId;

    return { conversation, response };
  },

  async composeResponse(
    request: DoctorAIRequest,
    conversation: ClinicalConversation,
    usedAttachments: ClinicalAttachment[],
  ): Promise<DoctorAIResponse> {
    const base = {
      conversationId: conversation.id,
      task: request.task,
      requiresDoctorReview: true,
      isDemo: true,
    } satisfies Partial<DoctorAIResponse>;

    if (request.task === "PATIENT_HISTORY_SUMMARY") {
      if (!request.patientId) {
        return {
          ...base,
          message:
            "Select a patient before requesting a history summary. The assistant only reads records for patients in your care.",
          limitations: demoLimitations(["No patient was selected, so no records were read."]),
        };
      }

      const { summary, records, doctorNames, followUpQuestions } = await buildHistorySummary(
        request.patientId,
      );

      return {
        ...base,
        message: `Prepared a demonstration history summary from ${records.length} record${records.length === 1 ? "" : "s"} you are authorized to access.`,
        generatedSummary: summary,
        followUpQuestions,
        sourceRecords: recordsToSources(records, doctorNames),
        limitations: demoLimitations([
          "Generated from the records listed under sources only. Nothing outside those records was read.",
          "Missing fields are reported as missing rather than filled in.",
        ]),
      };
    }

    if (request.task === "IMAGE_ASSISTANCE") {
      const images = usedAttachments.filter((item) => item.kind === "image");
      if (images.length === 0) {
        return {
          ...base,
          message: "Attach a clinical photograph (PNG, JPEG or WebP) to request image assistance.",
          limitations: demoLimitations(["No image was received in this request."]),
        };
      }

      return {
        ...base,
        message: `${images.length} image${images.length === 1 ? "" : "s"} received. This demonstration adapter performs no image analysis.`,
        observations: [
          ...describeAttachments(images).map((line) => `${line} was received.`),
          "No visual findings have been generated because no image model is connected.",
        ],
        limitations: demoLimitations([
          "No pixel-level analysis was performed. No lesion, wound or scan finding has been described.",
          "This is not an image interpretation and must not be treated as a diagnosis.",
          "Only PNG, JPEG and WebP images are supported; DICOM, CT, MRI and other specialised imaging formats are not supported.",
        ]),
        followUpQuestions: [
          "Would you like to record your own observations as a draft note instead?",
        ],
      };
    }

    if (request.task === "DOCUMENT_SUMMARY") {
      const documents = usedAttachments.filter((item) => item.kind === "document");
      if (documents.length === 0) {
        return {
          ...base,
          message: "Attach a PDF or plain-text document to request a document summary.",
          limitations: demoLimitations(["No document was received in this request."]),
        };
      }

      return {
        ...base,
        message: `${documents.length} document${documents.length === 1 ? "" : "s"} received. No text was extracted.`,
        observations: describeAttachments(documents).map(
          (line) => `${line} was received; contents were not read.`,
        ),
        limitations: demoLimitations([
          "The demonstration adapter performs no text extraction or OCR, so no values, units or reference ranges were read.",
          "A real document summary requires the backend AI service and its document parser.",
          "Nothing from this file has been added to any clinical record.",
        ]),
        followUpQuestions: [
          "Would you like to type the key findings so they can be organized into a note?",
        ],
      };
    }

    if (request.task === "CLINICAL_NOTE_ASSISTANCE") {
      if (!request.message.trim()) {
        return {
          ...base,
          message: "Enter the notes you want organized. The assistant restructures your text only.",
          limitations: demoLimitations(["No note text was provided."]),
        };
      }

      return {
        ...base,
        message: "Organized your notes into documentation sections. Nothing was added.",
        generatedSummary: organizeNotes(request.message),
        limitations: demoLimitations([
          "Examination findings, assessment and plan are marked as not provided because you did not enter them.",
          "No diagnosis or medication instruction was generated.",
        ]),
        followUpQuestions: [
          "Do you want the missing sections highlighted before you save the record?",
        ],
      };
    }

    if (request.task === "RESULT_COMPARISON") {
      if (!request.patientId) {
        return {
          ...base,
          message: "Select a patient to compare their records.",
          limitations: demoLimitations(["No patient was selected, so no records were read."]),
        };
      }

      const records = await services.medicalRecords.listByPatient(request.patientId);
      const doctors = await services.doctors.list();
      const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.fullName]));

      return {
        ...base,
        message:
          records.length >= 2
            ? `Compared ${records.length} recorded consultations.`
            : "There are not yet two records to compare.",
        generatedSummary: compareRecords(records),
        sourceRecords: recordsToSources(records, doctorNames),
        limitations: demoLimitations([
          "Only stored diagnoses, treatments and prescriptions were compared.",
          "No laboratory values, units or reference ranges exist in this dataset, so no trend is claimed.",
        ]),
      };
    }

    // GENERAL_QUESTION
    const patientLine = request.patientId
      ? `A patient is selected, so answers may reference that patient's authorized records.`
      : "No patient is selected, so this answer contains no patient-specific information.";

    return {
      ...base,
      message:
        "This demonstration assistant can summarize authorized patient history, organize your own notes, compare recorded visits, and acknowledge uploaded images or documents. It does not diagnose, prescribe or modify records.",
      observations: [
        patientLine,
        usedAttachments.length
          ? `Attachments in this message: ${describeAttachments(usedAttachments).join("; ")}.`
          : "No attachments were included in this message.",
      ],
      limitations: demoLimitations([
        "No clinical question database is connected; this reply describes assistant capabilities only.",
        "Nothing here is a diagnosis, prescription or treatment order.",
      ]),
      followUpQuestions: [
        "Would you like a summary of the selected patient's history?",
        "Should I organize the consultation notes you type?",
      ],
    };
  },
};

export type ClinicalAssistantService = typeof clinicalAssistantService;

export type { MedicalRecord, Patient };
