import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { AIRecommendation, UrgencyLevel } from "@/types";
import { formatDateTime } from "@/utils/format";

const triageSchema = z.object({
  symptoms: z
    .string()
    .min(10, "Describe your symptoms in at least 10 characters")
    .max(500, "Keep the description under 500 characters"),
});

type TriageValues = z.infer<typeof triageSchema>;

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MODERATE: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  EMERGENCY: "border-red-200 bg-red-50 text-red-700",
};

function RecommendationCard({ recommendation }: { recommendation: AIRecommendation }) {
  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Suggested next step</CardTitle>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${URGENCY_STYLES[recommendation.urgency]}`}
          >
            {recommendation.urgency} urgency
          </span>
        </div>
        <CardDescription>{formatDateTime(recommendation.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase">
            Recommended specialty
          </span>
          <Badge>{recommendation.recommendedSpecialty}</Badge>
        </div>
        <p>{recommendation.symptomsSummary}</p>
        <div className="bg-secondary/60 rounded-lg p-3 text-sm">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {recommendation.advice}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/patient/doctors">Find a {recommendation.recommendedSpecialty} doctor</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PatientAiNavigator() {
  const { user } = useAuth();
  const patientId = user?.id ?? "";
  const [result, setResult] = useState<AIRecommendation | null>(null);

  const history = useServiceQuery(
    () => services.aiNavigator.listByPatient(patientId),
    patientId,
  );

  const form = useForm<TriageValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: { symptoms: "" },
  });

  async function onSubmit(values: TriageValues) {
    try {
      const recommendation = await services.aiNavigator.analyze({
        patientId,
        symptoms: values.symptoms,
      });
      setResult(recommendation);
      history.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Navigator"
        description="Describe how you feel and get a suggested specialty, urgency level and next step."
        breadcrumbs={[
          { label: "Patient", to: "/patient" },
          { label: "AI Navigator" },
        ]}
      />

      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="text-sm text-amber-900">
          This demo uses simple keyword rules, not a medical AI model. It is not a
          diagnosis. For emergencies, contact emergency services immediately.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How are you feeling?</CardTitle>
          <CardDescription>
            Mention the main symptom, how long it has lasted and anything that makes it
            worse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="symptoms">Symptoms</Label>
              <Textarea
                id="symptoms"
                rows={4}
                placeholder="e.g. Chest tightness when climbing stairs and shortness of breath for 3 days"
                aria-invalid={!!form.formState.errors.symptoms}
                {...form.register("symptoms")}
              />
              {form.formState.errors.symptoms && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.symptoms.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Sparkles className="size-4" />
              {form.formState.isSubmitting ? "Analyzing…" : "Get guidance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && <RecommendationCard recommendation={result} />}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Previous guidance</h2>
        {(history.data ?? []).length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No previous guidance"
            description="Your earlier symptom checks will be listed here."
          />
        ) : (
          <div className="space-y-3">
            {(history.data ?? []).slice(0, 3).map((item) => (
              <RecommendationCard key={item.id} recommendation={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
