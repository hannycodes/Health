import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { AIResponseCard } from "@/components/doctor/assistant/AIResponseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import {
  clinicalAssistantService,
  type DoctorAIResponse,
} from "@/features/doctor/services/clinicalAssistantService";
import { services } from "@/services";

interface ClinicalSummaryPanelProps {
  doctorId: string;
  patientId: string;
  hospitalId: string;
  onSaved?: () => void;
}

/**
 * Generate an AI-assisted history summary and require an explicit clinician
 * approval step before it can become a clinical record.
 */
export function ClinicalSummaryPanel({
  doctorId,
  patientId,
  hospitalId,
  onSaved,
}: ClinicalSummaryPanelProps) {
  const [response, setResponse] = useState<DoctorAIResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [title, setTitle] = useState("AI-assisted history summary");

  async function generate() {
    setIsGenerating(true);
    try {
      const result = await clinicalAssistantService.send(doctorId, {
        message: "Summarize this patient's medical history and highlight important information.",
        patientId,
        task: "PATIENT_HISTORY_SUMMARY",
      });
      setResponse(result.response);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function approveAndSave() {
    if (!response?.generatedSummary) return;
    if (!title.trim()) {
      toast.error("Give the record a short title before saving.");
      return;
    }

    setIsApproving(true);
    try {
      await services.medicalRecords.create({
        patientId,
        doctorId,
        hospitalId,
        diagnosis: title.trim(),
        treatment: "Reviewed by the ordering clinician before saving.",
        prescription: [],
        notes: response.generatedSummary,
      });
      toast.success("Summary saved as a clinical record.");
      setResponse(null);
      onSaved?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="text-primary size-4" aria-hidden="true" />
          AI-assisted history summary
        </CardTitle>
        <CardDescription>
          Generated from the records you are authorized to access, then reviewed by you
          before it is saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!response && (
          <Button onClick={() => void generate()} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate medical history summary
          </Button>
        )}

        {response && (
          <>
            <AIResponseCard
              response={response}
              patientId={patientId}
              actions={
                <>
                  <Button
                    size="sm"
                    onClick={() => void approveAndSave()}
                    disabled={isApproving}
                  >
                    {isApproving && <Loader2 className="size-4 animate-spin" />}
                    Approve and save as record
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResponse(null)}>
                    Discard
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void generate()}>
                    Regenerate
                  </Button>
                </>
              }
            />

            <div className="space-y-1.5">
              <Label htmlFor="summary-title">Record title (required to save)</Label>
              <Input
                id="summary-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
              />
              <p className="text-muted-foreground text-xs">
                Saving writes a new record authored by you. Existing records are never
                modified.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
