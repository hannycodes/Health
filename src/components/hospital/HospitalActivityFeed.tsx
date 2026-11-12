import { Building2, CalendarDays, Stethoscope } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityItem } from "@/pages/hospital-admin/selectors";
import { formatDateTime } from "@/utils/format";

const ICONS = {
  appointment: CalendarDays,
  doctor: Stethoscope,
  department: Building2,
} as const;

export function HospitalActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>Latest appointments, doctors and departments.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No hospital activity yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground truncate text-xs">{item.description}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(item.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
