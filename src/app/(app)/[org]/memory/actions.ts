"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import Decimal from "decimal.js";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { audit } from "@/lib/audit/log";

export async function deleteMemoryAction(orgSlug: string, id: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const before = await db.query.clientMemory.findFirst({ where: and(eq(schema.clientMemory.organizationId, ctx.org.id), eq(schema.clientMemory.id, id)) });
  if (!before) return;
  await db.delete(schema.clientMemory).where(eq(schema.clientMemory.id, id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "client_memory", entityId: id, action: "delete", before });
  revalidatePath(`/${ctx.org.slug}/memory`);
}

export async function updateMemoryAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const p = z.object({ id: z.string().uuid(), hsCode: z.string().regex(/^\d{10}$/) }).parse({ id: formData.get("id"), hsCode: String(formData.get("hsCode") ?? "").replace(/\s/g, "") });
  const before = await db.query.clientMemory.findFirst({ where: and(eq(schema.clientMemory.organizationId, ctx.org.id), eq(schema.clientMemory.id, p.id)) });
  if (!before) throw new Error("not found");
  await db.update(schema.clientMemory).set({ hsCode: p.hsCode, timesConfirmed: 1 }).where(eq(schema.clientMemory.id, p.id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "client_memory", entityId: p.id, action: "update", before: { hsCode: before.hsCode }, after: { hsCode: p.hsCode } });
  revalidatePath(`/${ctx.org.slug}/memory`);
}

export async function addReferencePriceAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const p = z
    .object({ hsCode: z.string().regex(/^\d{10}$/), originCountry: z.string().trim().max(2).transform((v) => v.toUpperCase() || null), unitBasis: z.enum(["per_kg", "per_unit"]), unitPriceGel: z.string().regex(/^\d+([.,]\d{1,4})?$/), observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().trim().max(200).transform((v) => v || null) })
    .parse({ hsCode: String(formData.get("hsCode") ?? "").replace(/\s/g, ""), originCountry: formData.get("originCountry") ?? "", unitBasis: formData.get("unitBasis"), unitPriceGel: formData.get("unitPriceGel"), observedAt: formData.get("observedAt"), note: formData.get("note") ?? "" });
  const [row] = await db.insert(schema.priceReferences).values({ organizationId: ctx.org.id, hsCode: p.hsCode, originCountry: p.originCountry, unitBasis: p.unitBasis, unitPriceGel: new Decimal(p.unitPriceGel.replace(",", ".")).toFixed(4), observedAt: p.observedAt, source: "user_reference", note: p.note }).returning();
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "price_references", entityId: row!.id, action: "create", after: p });
  revalidatePath(`/${ctx.org.slug}/memory`);
}

export async function deleteReferencePriceAction(orgSlug: string, id: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const before = await db.query.priceReferences.findFirst({ where: and(eq(schema.priceReferences.organizationId, ctx.org.id), eq(schema.priceReferences.id, id)) });
  if (!before) return;
  await db.delete(schema.priceReferences).where(eq(schema.priceReferences.id, id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "price_references", entityId: id, action: "delete", before });
  revalidatePath(`/${ctx.org.slug}/memory`);
}
