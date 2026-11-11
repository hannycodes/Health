import {
  Building2,
  Settings,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { AUDIT_ACTION_LABELS } from "@/constants";
import type { AuditLog } from "@/types";
import { formatDateTime } from "@/utils/format";

function iconFor(log: AuditLog): LucideIcon {
  if (log.action.startsWith("HOSPITAL_")) return Building2;
  if (log.action.startsWith("ADMINISTRATOR_")) return UserCog;
  if (log.action === "SETTINGS_UPDATED") return Settings;
  if (log.action === "ROLE_ASSIGNED") return ShieldCheck;
  return UserCog;
}

export function PlatformActivityFeed({
  logs,
  limit = 6,
}: {
  logs: AuditLog[];
  limit?: number;
}) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="No platform activity yet"
        description="Administrative actions will appear here as they are recorded."
      />
    );
  }

  return (
    <ol className="divide-y">
      {logs.slice(0, limit).map((log) => {
        const Icon = iconFor(log);
        return (
          <li key={log.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="bg-secondary text-secondary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">
                {AUDIT_ACTION_LABELS[log.action]}
              </p>
              <p className="text-muted-foreground text-xs">{log.description}</p>
              <p className="text-muted-foreground text-[11px]">
                {log.actorName} · {log.entityLabel} ·{" "}
                {formatDateTime(log.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
