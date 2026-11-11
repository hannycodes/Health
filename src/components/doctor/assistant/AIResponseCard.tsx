import type { ReactNode } from "react";
import { AlertTriangle, Info, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DoctorAIResponse } from "@/features/doctor/services/clinicalAssistantService";
import { SourceRecordList } from "./SourceRecordList";

interface AIResponseCardProps {
  response: DoctorAIResponse;
  patientId?: string;
  actions?: ReactNode;
}

/**
 * Every AI output goes through this card so it can never be mistaken for a
 * verified clinical record: it is labelled, it shows its sources, it shows its
 * limitations, and it states that clinician review is required.
 */
export function AIResponseCard({ response, patientId, actions }: AIResponseCardProps) {
  return (
    <Card className="border-primary/25 bg-secondary/40">
      <CardHeader className="gap-2 pb-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1">
            <Sparkles className="size-3" aria-hidden="true" />
            AI-assisted
          </Badge>
          {response.isDemo ? (
            <Badge variant="outline">Demonstration output</Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-800"
            >
              Live model{response.provider ? ` · ${response.provider}` : ""}
            </Badge>
          )}
          {response.urgency && (
            <Badge
              variant="outline"
              className={
                response.urgency === "EMERGENCY" || response.urgency === "HIGH"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : response.urgency === "MODERATE"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
              }
            >
              Urgency: {response.urgency}
            </Badge>
          )}
          {response.requiresDoctorReview && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              Requires clinician review
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium">{response.message}</p>
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        {response.generatedSummary && (
          <div className="bg-card rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
              AI-generated summary — not part of the medical record
            </p>
            <pre className="font-sans text-xs leading-relaxed whitespace-pre-wrap">
              {response.generatedSummary}
            </pre>
          </div>
        )}

        {response.observations && response.observations.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              AI-assisted observations
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              {response.observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {response.redFlags && response.redFlags.length > 0 && (
          <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-red-800 uppercase">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Red flags in the documented data
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-red-900">
              {response.redFlags.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {response.clinicalConsiderations && response.clinicalConsiderations.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Clinical considerations — unconfirmed, for clinician evaluation
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              {response.clinicalConsiderations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {response.recommendedNextSteps && response.recommendedNextSteps.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Suggested next steps (for your consideration)
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              {response.recommendedNextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {response.sourceRecords && response.sourceRecords.length > 0 && (
          <SourceRecordList records={response.sourceRecords} patientId={patientId} />
        )}

        {response.followUpQuestions && response.followUpQuestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Suggested follow-ups
            </p>
            <ul className="space-y-1 text-xs">
              {response.followUpQuestions.map((question) => (
                <li key={question} className="flex items-start gap-1.5">
                  <Info className="text-muted-foreground mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {response.limitations && response.limitations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                <AlertTriangle className="size-3" aria-hidden="true" />
                Limitations
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">
                {response.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </CardContent>
    </Card>
  );
}
