import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeriesPoint } from "@/pages/hospital-admin/selectors";

interface BarChartCardProps {
  title: string;
  description?: string;
  points: SeriesPoint[];
  emptyMessage: string;
}

/** Horizontal bars for categorical breakdowns (department, doctor). */
export function BarChartCard({ title, description, points, emptyMessage }: BarChartCardProps) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <EmptyState icon={BarChart3} title={emptyMessage} className="py-8" />
        ) : (
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{point.label}</span>
                  <span className="text-muted-foreground tabular-nums">{point.value}</span>
                </div>
                <div
                  className="bg-muted h-2 overflow-hidden rounded-full"
                  role="img"
                  aria-label={`${point.label}: ${point.value} appointments`}
                >
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.max(4, (point.value / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Vertical columns for a time series. */
export function TrendChartCard({ title, description, points }: BarChartCardProps) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-1" aria-hidden="true">
          {points.map((point) => (
            <div key={point.key} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="bg-primary/80 hover:bg-primary w-full rounded-t"
                style={{ height: `${Math.max(3, (point.value / max) * 100)}%` }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          ))}
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-[11px]">
          <span>{points[0]?.label}</span>
          <span>{points[points.length - 1]?.label}</span>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Peak day: {points.reduce((best, point) => (point.value > best.value ? point : best), points[0] ?? { key: "", label: "—", value: 0 }).label}
        </p>
      </CardContent>
    </Card>
  );
}
