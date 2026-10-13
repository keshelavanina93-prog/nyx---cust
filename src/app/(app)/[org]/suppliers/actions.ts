"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { audit } from "@/lib/audit/log";

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(160),
  country: z.string().trim().max(2).transform((v) => v.toUpperCase() || null),
  address: z.string().trim().max(300).transform((v) => v || null),
  taxId: z.string().trim().max(40).transform((v) => v || null),
  defaultIncoterm: z.string().trim().max(3).transform((v) => v.toUpperCase() || null),
  defaultCurrency: z.string().trim().max(3).transform((v) => v.toUpperCase() || null),
  defaultOriginCountry: z.string().trim().max(2).transform((v) => v.toUpperCase() || null),
});

export async function upsertSupplierAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const id = String(formData.get("id") ?? "");
  const p = supplierSchema.parse(Object.fromEntries(["name", "country", "address", "taxId", "defaultIncoterm", "defaultCurrency", "defaultOriginCountry"].map((k) => [k, formData.get(k) ?? ""])));
  if (id) {
    const before = await db.query.suppliers.findFirst({ where: and(eq(schema.suppliers.organizationId, ctx.org.id), eq(schema.suppliers.id, id)) });
    if (!before) throw new Error("not found");
    await db.update(schema.suppliers).set(p).where(eq(schema.suppliers.id, id));
    await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "suppliers", entityId: id, action: "update", before, after: p });
  } else {
    const [row] = await db.insert(schema.suppliers).values({ organizationId: ctx.org.id, ...p }).returning();
    await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "suppliers", entityId: row!.id, action: "create", after: p });
  }
  revalidatePath(`/${ctx.org.slug}/suppliers`);
}

export async function deleteSupplierAction(orgSlug: string, id: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const before = await db.query.suppliers.findFirst({ where: and(eq(schema.suppliers.organizationId, ctx.org.id), eq(schema.suppliers.id, id)) });
  if (!before) return;
  await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "suppliers", entityId: id, action: "delete", before });
  revalidatePath(`/${ctx.org.slug}/suppliers`);
}
