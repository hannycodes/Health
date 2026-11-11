import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ChartPoint {
  label: string;
  value: number;
}

const TONE_CLASSES = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
} as const;

/**
 * Lightweight bar chart.
 *
 * The repository has no charting dependency, so this renders accessible bars
 * with CSS instead of adding one for the hackathon build.
 */
export function AnalyticsBarCard({
  title,
  description,
  data,
  tone = "emerald",
  unit = "records",
}: {
  title: string;
  description?: string;
  data: ChartPoint[];
  tone?: keyof typeof TONE_CLASSES;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No data for this period"
            description="Try a wider date range."
          />
        ) : (
          <div
            className="space-y-3"
            role="img"
            aria-label={`${title} bar chart`}
          >
            {data.map((point) => (
              <div
                key={point.label}
                className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3 text-xs"
              >
                <span className="text-muted-foreground">{point.label}</span>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${TONE_CLASSES[tone]}`}
                    style={{ width: `${(point.value / max) * 100}%` }}
                  />
                </div>
                <span className="text-right font-medium tabular-nums">
                  {point.value}
                </span>
              </div>
            ))}
            <p className="text-muted-foreground pt-1 text-[11px]">
              Values are {unit} recorded in this environment.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
