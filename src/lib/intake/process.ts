/**
 * Shared intake processing: channel lookup → allowlist → shipment + documents + intake_messages + audit.
 * Never auto-confirms anything; the importer continues in the web app.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { putFile, sha256, ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { audit } from "@/lib/audit/log";
import { defaultMode } from "@/lib/customs/fees";
import { todayIso } from "@/lib/utils";
import type { IntakeEnvelope, IntakeResult } from "./types";

export async function processIntake(db: Db, env: IntakeEnvelope): Promise<IntakeResult> {
  // Chat bots: /start <code> links the chat to an organization (one-time code = channel.secret)
  if (env.linkCode) {
    const pending = await db.query.intakeChannels.findFirst({ where: and(eq(schema.intakeChannels.kind, env.kind), eq(schema.intakeChannels.secret, env.linkCode)) });
    if (!pending) return { status: "ignored", reason: "unknown_link_code", replyText: "კოდი ვერ მოიძებნა. აიღე ახალი კოდი აპის პარამეტრებიდან." };
    await db.update(schema.intakeChannels).set({ addressOrChatId: env.address, verified: true }).where(eq(schema.intakeChannels.id, pending.id));
    await audit({ organizationId: pending.organizationId, actorType: "system", entity: "intake_channels", entityId: pending.id, action: "linked", after: { kind: env.kind } }, db);
    return { status: "linked", replyText: "არხი დაკავშირებულია. გამოგზავნე ინვოისი (PDF / ფოტო)." };
  }

  const channel = await db.query.intakeChannels.findFirst({ where: and(eq(schema.intakeChannels.kind, env.kind), eq(schema.intakeChannels.addressOrChatId, env.address)) });
  const dup = await db.query.intakeMessages.findFirst({ where: and(eq(schema.intakeMessages.kind, env.kind), eq(schema.intakeMessages.externalId, env.externalId)) });
  if (dup) return { status: dup.status === "attached" ? "attached" : "ignored", shipmentId: dup.shipmentId ?? undefined, reason: "duplicate" };

  const record = async (status: "received" | "attached" | "ignored" | "error", shipmentId: string | null, orgId: string | null) => {
    await db.insert(schema.intakeMessages).values({ organizationId: orgId, channelId: channel?.id ?? null, kind: env.kind, externalId: env.externalId, fromAddress: env.from, rawMeta: (env.rawMeta ?? null) as never, shipmentId, status });
    await audit({ organizationId: orgId, actorType: "system", entity: "intake_messages", entityId: env.externalId, action: `intake_${status}`, after: { kind: env.kind, from: env.from, files: env.files.length } }, db);
  };

  if (!channel || !channel.verified) {
    await record("ignored", null, channel?.organizationId ?? null);
    return { status: "ignored", reason: "unknown_channel" };
  }
  // Email allowlist (brief phase 2 §1). Chat channels are bound to a chat id, so the chat itself is the identity.
  if (env.kind === "email") {
    const from = env.from.toLowerCase();
    const ok = channel.allowlist.some((a) => a === from || (a.startsWith("@") && from.endsWith(a)));
    if (!ok) {
      await record("ignored", null, channel.organizationId);
      return { status: "ignored", reason: "sender_not_allowlisted" };
    }
  }
  const files = env.files.filter((f) => ALLOWED_MIME.has(f.mime) && f.data.length <= MAX_UPLOAD_BYTES);
  if (files.length === 0) {
    await record("ignored", null, channel.organizationId);
    return { status: "ignored", reason: "no_supported_attachments", replyText: "მიამაგრე ინვოისი PDF / JPG / PNG ფორმატში (≤20MB)." };
  }
  const reference = (env.subject?.trim() || `${env.kind.toUpperCase()}-${todayIso()}-${env.externalId.slice(-6)}`).slice(0, 80);
  const [shipment] = await db.insert(schema.shipments).values({ organizationId: channel.organizationId, reference, mode: defaultMode(false), declarationRegistrationDate: todayIso(), status: "draft" }).returning();
  for (const f of files) {
    const stored = await putFile(channel.organizationId, f.name, f.data, f.mime);
    await db.insert(schema.documents).values({ organizationId: channel.organizationId, shipmentId: shipment!.id, kind: "invoice", fileName: f.name, blobUrl: stored.url, mime: f.mime, sizeBytes: f.data.length, source: env.kind, sha256: sha256(f.data) });
  }
  await record("attached", shipment!.id, channel.organizationId);
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, channel.organizationId) });
  const link = `${process.env.APP_BASE_URL ?? ""}/${org?.slug}/shipments/${shipment!.id}/intake`;
  return { status: "attached", shipmentId: shipment!.id, replyText: `ტვირთი შეიქმნა: ${reference}. გააგრძელე აპში: ${link}` };
}
