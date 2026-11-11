import type {
  AuditAction,
  AuditEntityType,
  AuditLog,
  AuditResult,
} from "@/types";
import type { DemoDatabase } from "@/data/database";
import { readSession } from "@/lib/session";
import { createId } from "./utils";

/**
 * MOCK BACKEND ONLY.
 *
 * Audit entries are written by the mock service layer as a stand-in for the
 * backend, never by pages. The actor is derived from the stored session rather
 * than from component input, mirroring how the real API would use the token.
 */
export function recordAudit(
  db: DemoDatabase,
  input: {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    entityLabel: string;
    description: string;
    result?: AuditResult;
    metadata?: Record<string, string>;
  },
): AuditLog {
  const session = readSession();

  const entry: AuditLog = {
    id: createId("aud"),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    description: input.description,
    actorId: session?.user.id ?? "system",
    actorName: session?.user.fullName ?? "System",
    result: input.result ?? "SUCCESS",
    createdAt: new Date().toISOString(),
    metadata: input.metadata,
  };

  db.auditLogs = [entry, ...db.auditLogs];
  return entry;
}
