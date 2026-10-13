import { getDb, schema } from "@/db/client";
import type { Db } from "@/db/client";

export type AuditEntry = {
  organizationId: string | null;
  actorType: "user" | "ai" | "system";
  actorId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

/** Append-only audit log. Never update/delete (DB trigger enforces it). */
export async function audit(entry: AuditEntry, db?: Db) {
  const d = db ?? (await getDb());
  await d.insert(schema.auditLog).values({
    organizationId: entry.organizationId,
    actorType: entry.actorType,
    actorId: entry.actorId ?? null,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
  });
}
