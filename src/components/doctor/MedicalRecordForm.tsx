import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";

import { AIResponseCard } from "@/components/doctor/assistant/AIResponseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/http";
import {
  clinicalAssistantService,
  type DoctorAIResponse,
} from "@/features/doctor/services/clinicalAssistantService";
import type { AppointmentWithDetails, Patient } from "@/types";
import { formatDate } from "@/utils/format";

/**
 * The shared MedicalRecord model stores diagnosis, treatment, prescription and
 * notes. Complaint/examination/plan sub-fields from the clinical guide do not
 * exist yet, so the form collects what the model can persist and asks the
 * doctor to put examination and plan detail into the appropriate field.
 */
export const medicalRecordSchema = z.object({
  appointmentId: z.string().optional(),
  diagnosis: z.string().trim().min(3, "Enter the assessment or diagnosis.").max(200),
  treatment: z.string().trim().min(10, "Describe the treatment plan (at least 10 characters)."),
  prescription: z.string().trim(),
  notes: z.string().trim().max(4000, "Keep notes under 4000 characters."),
});

export type MedicalRecordValues = z.infer<typeof medicalRecordSchema>;

interface MedicalRecordFormProps {
  patient: Patient;
  doctorId: string;
  hospitalId: string;
  doctorName: string;
  hospitalName: string;
  appointments: AppointmentWithDetails[];
  defaultAppointmentId?: string;
  isSubmitting: boolean;
  onSubmit: (values: MedicalRecordValues) => Promise<void>;
  onCancel: () => void;
}

export function MedicalRecordForm({
  patient,
  doctorId,
  doctorName,
  hospitalName,
  appointments,
  defaultAppointmentId,
  isSubmitting,
  onSubmit,
  onCancel,
}: MedicalRecordFormProps) {
  const form = useForm<MedicalRecordValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      appointmentId: defaultAppointmentId ?? "none",
      diagnosis: "",
      treatment: "",
      prescription: "",
      notes: "",
    },
  });

  const [aiDraft, setAiDraft] = useState<DoctorAIResponse | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const linkedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "CANCELLED"),
    [appointments],
  );

  async function organizeWithAI() {
    const raw = form.getValues("notes").trim();
    if (!raw) {
      toast.error("Enter your notes first, then let the assistant organize them.");
      return;
    }

    setIsOrganizing(true);
    try {
      const result = await clinicalAssistantService.send(doctorId, {
        message: raw,
        patientId: patient.id,
        task: "CLINICAL_NOTE_ASSISTANCE",
      });
      setAiDraft(result.response);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsOrganizing(false);
    }
  }

  function applyDraft() {
    if (!aiDraft?.generatedSummary) return;
    // Explicit doctor action: the draft only reaches the form after review.
    form.setValue("notes", aiDraft.generatedSummary, { shouldDirty: true });
    setAiDraft(null);
    toast.success("AI draft inserted into notes. Review before saving.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultation</CardTitle>
          <p className="text-muted-foreground text-xs">
            {patient.fullName} · {doctorName} · {hospitalName}
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            noValidate
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <div className="space-y-1.5">
              <Label htmlFor="appointmentId">Related appointment</Label>
              <Select
                value={form.watch("appointmentId") ?? "none"}
                onValueChange={(value) =>
                  form.setValue("appointmentId", value, { shouldDirty: true })
                }
              >
                <SelectTrigger id="appointmentId">
                  <SelectValue placeholder="Select an appointment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked appointment</SelectItem>
                  {linkedAppointments.map((appointment) => (
                    <SelectItem key={appointment.id} value={appointment.id}>
                      {formatDate(appointment.date)} · {appointment.startTime} ·{" "}
                      {appointment.reason.slice(0, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                The record timestamp is set by the service when the record is saved.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">Assessment / diagnosis</Label>
              <Input
                id="diagnosis"
                placeholder="e.g. Stage 1 hypertension, likely essential"
                aria-invalid={Boolean(form.formState.errors.diagnosis)}
                {...form.register("diagnosis")}
              />
              {form.formState.errors.diagnosis && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.diagnosis.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="treatment">Treatment plan and follow-up</Label>
              <Textarea
                id="treatment"
                rows={3}
                placeholder="Treatment, follow-up interval and any referrals."
                aria-invalid={Boolean(form.formState.errors.treatment)}
                {...form.register("treatment")}
              />
              {form.formState.errors.treatment && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.treatment.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prescription">Prescription (one item per line)</Label>
              <Textarea
                id="prescription"
                rows={3}
                placeholder={"Amlodipine 5mg — once daily\nReview in 4 weeks"}
                {...form.register("prescription")}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="notes">Clinical notes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void organizeWithAI()}
                  disabled={isOrganizing}
                >
                  {isOrganizing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Organize notes with AI
                </Button>
              </div>
              <Textarea
                id="notes"
                rows={5}
                placeholder="Complaint, symptoms, examination findings and observations."
                {...form.register("notes")}
              />
              {form.formState.errors.notes && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.notes.message}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                The assistant reorganizes your own text only; it never adds findings or a
                diagnosis.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Save record
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {aiDraft && (
        <AIResponseCard
          response={aiDraft}
          patientId={patient.id}
          actions={
            <>
              <Button type="button" size="sm" onClick={applyDraft}>
                Insert into notes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAiDraft(null)}
              >
                Discard
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
