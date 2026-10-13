"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import Decimal from "decimal.js";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { audit } from "@/lib/audit/log";

export async function updateOrgAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  const p = z
    .object({ name: z.string().trim().min(2).max(120), taxId: z.string().trim().max(20).transform((v) => v || null), legalForm: z.string().trim().max(40).transform((v) => v || null), address: z.string().trim().max(300).transform((v) => v || null), defaultCurrency: z.string().trim().length(3).transform((v) => v.toUpperCase()), isNaturalPerson: z.boolean(), brokerCostPerHsGel: z.string().regex(/^\d+([.,]\d{1,2})?$/) })
    .parse({ name: formData.get("name"), taxId: formData.get("taxId") ?? "", legalForm: formData.get("legalForm") ?? "", address: formData.get("address") ?? "", defaultCurrency: formData.get("defaultCurrency") ?? "USD", isNaturalPerson: formData.get("isNaturalPerson") === "on", brokerCostPerHsGel: formData.get("brokerCostPerHsGel") ?? "100" });
  const before = ctx.org;
  const set = { ...p, brokerCostPerHsGel: new Decimal(p.brokerCostPerHsGel.replace(",", ".")).toFixed(2) };
  await db.update(schema.organizations).set(set).where(eq(schema.organizations.id, ctx.org.id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "organizations", entityId: ctx.org.id, action: "update", before: { name: before.name, taxId: before.taxId, isNaturalPerson: before.isNaturalPerson, brokerCostPerHsGel: before.brokerCostPerHsGel }, after: set });
  revalidatePath(`/${ctx.org.slug}/settings`);
}

export async function inviteAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  const p = z.object({ email: z.string().email(), role: z.enum(["owner", "member", "viewer"]) }).parse({ email: String(formData.get("email") ?? "").toLowerCase(), role: formData.get("role") });
  const existingUser = await db.query.users.findFirst({ where: eq(schema.users.email, p.email) });
  if (existingUser) {
    const m = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.organizationId, ctx.org.id), eq(schema.memberships.userId, existingUser.id)) });
    if (!m) await db.insert(schema.memberships).values({ organizationId: ctx.org.id, userId: existingUser.id, role: p.role });
    else await db.update(schema.memberships).set({ role: p.role }).where(eq(schema.memberships.id, m.id));
  } else {
    await db.insert(schema.invitations).values({ organizationId: ctx.org.id, email: p.email, role: p.role, token: randomBytes(16).toString("hex") });
  }
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "memberships", entityId: null, action: "invite", after: p });
  revalidatePath(`/${ctx.org.slug}/settings`);
}

export async function setRoleAction(orgSlug: string, membershipId: string, role: "owner" | "member" | "viewer") {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  const m = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.organizationId, ctx.org.id), eq(schema.memberships.id, membershipId)) });
  if (!m) return;
  await db.update(schema.memberships).set({ role }).where(eq(schema.memberships.id, m.id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "memberships", entityId: m.id, action: "set_role", before: { role: m.role }, after: { role } });
  revalidatePath(`/${ctx.org.slug}/settings`);
}

export async function removeMemberAction(orgSlug: string, membershipId: string) {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  const m = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.organizationId, ctx.org.id), eq(schema.memberships.id, membershipId)) });
  if (!m || m.userId === ctx.user.id) return;
  await db.delete(schema.memberships).where(eq(schema.memberships.id, m.id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "memberships", entityId: m.id, action: "remove", before: m });
  revalidatePath(`/${ctx.org.slug}/settings`);
}

/** Create / rotate intake channels (Phase 2). Email address = <slug>@in.<domain>; Telegram = one-time link code. */
export async function ensureIntakeChannelAction(orgSlug: string, kind: "email" | "telegram" | "viber") {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  const domain = process.env.INBOUND_EMAIL_DOMAIN ?? "in.example.com";
  const address = kind === "email" ? `${ctx.org.slug}@${domain}` : `pending:${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(12).toString("hex");
  const existing = await db.query.intakeChannels.findFirst({ where: and(eq(schema.intakeChannels.organizationId, ctx.org.id), eq(schema.intakeChannels.kind, kind)) });
  if (existing) {
    await db.update(schema.intakeChannels).set({ secret, verified: kind === "email" ? existing.verified : false, addressOrChatId: kind === "email" ? existing.addressOrChatId : address }).where(eq(schema.intakeChannels.id, existing.id));
  } else {
    await db.insert(schema.intakeChannels).values({ organizationId: ctx.org.id, kind, addressOrChatId: address, secret, verified: kind === "email", allowlist: [ctx.user.email] });
  }
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "intake_channels", entityId: null, action: existing ? "rotate" : "create", after: { kind } });
  revalidatePath(`/${ctx.org.slug}/settings`);
}

export async function updateAllowlistAction(orgSlug: string, channelId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  const list = String(formData.get("allowlist") ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const ch = await db.query.intakeChannels.findFirst({ where: and(eq(schema.intakeChannels.organizationId, ctx.org.id), eq(schema.intakeChannels.id, channelId)) });
  if (!ch) return;
  await db.update(schema.intakeChannels).set({ allowlist: list }).where(eq(schema.intakeChannels.id, ch.id));
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "intake_channels", entityId: ch.id, action: "allowlist", before: ch.allowlist, after: list });
  revalidatePath(`/${ctx.org.slug}/settings`);
}

export async function deleteOrgAction(orgSlug: string) {
  const ctx = await requireOrg(orgSlug, ["owner"]);
  const db = await getDb();
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "organizations", entityId: ctx.org.id, action: "delete", before: { name: ctx.org.name } });
  await db.delete(schema.organizations).where(eq(schema.organizations.id, ctx.org.id));
  redirect("/");
}
