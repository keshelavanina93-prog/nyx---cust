"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { requireUser } from "@/lib/org";
import { audit } from "@/lib/audit/log";
import { slugify } from "@/lib/utils";

const schemaOrg = z.object({ name: z.string().min(2).max(120), slug: z.string().min(2).max(60).optional(), taxId: z.string().max(20).optional() });

export async function createOrgAction(formData: FormData) {
  const user = await requireUser();
  const parsed = schemaOrg.parse({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "") || undefined,
    taxId: String(formData.get("taxId") ?? "") || undefined,
  });
  const db = await getDb();
  let slug = slugify(parsed.slug ?? parsed.name);
  for (let i = 0; i < 5; i++) {
    const exists = await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, slug) });
    if (!exists) break;
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const [org] = await db.insert(schema.organizations).values({ name: parsed.name, slug, taxId: parsed.taxId ?? null }).returning();
  await db.insert(schema.memberships).values({ organizationId: org!.id, userId: user.id, role: "owner" });
  await db.insert(schema.ecustomsProfiles).values({ organizationId: org!.id });
  await audit({ organizationId: org!.id, actorType: "user", actorId: user.id, entity: "organizations", entityId: org!.id, action: "create", after: { name: parsed.name, slug } });
  redirect(`/${slug}/dashboard`);
}
