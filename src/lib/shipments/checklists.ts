import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { loadChecklistTemplate } from "@/lib/content/guide";

type Kind = (typeof schema.checklistKind.enumValues)[number];

export async function ensureChecklist(db: Db, orgId: string, shipmentId: string | null, kind: Kind) {
  const where = shipmentId
    ? and(eq(schema.checklists.organizationId, orgId), eq(schema.checklists.shipmentId, shipmentId), eq(schema.checklists.kind, kind))
    : and(eq(schema.checklists.organizationId, orgId), eq(schema.checklists.kind, kind));
  const existing = await db.query.checklists.findFirst({ where });
  if (existing) return existing;
  const items = await loadChecklistTemplate(kind);
  const [row] = await db.insert(schema.checklists).values({ organizationId: orgId, shipmentId, kind, items }).returning();
  return row!;
}

export async function toggleChecklistItem(db: Db, orgId: string, checklistId: string, key: string, done: boolean, docId?: string | null) {
  const row = await db.query.checklists.findFirst({ where: and(eq(schema.checklists.organizationId, orgId), eq(schema.checklists.id, checklistId)) });
  if (!row) throw new Error("checklist not found");
  const items = row.items.map((i) => (i.key === key ? { ...i, done, doc_id: docId === undefined ? i.doc_id : docId } : i));
  await db.update(schema.checklists).set({ items }).where(eq(schema.checklists.id, row.id));
  return { before: row.items, after: items };
}
