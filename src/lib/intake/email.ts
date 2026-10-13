/**
 * Inbound email adapter — generic JSON webhook [ASSUMPTION: provider-agnostic shape, works with
 * Resend / Postmark / SendGrid "inbound parse" after a small mapping]. Auth: shared secret in
 * `x-intake-secret` header or `?secret=` (INBOUND_EMAIL_SECRET).
 * Expected body: { id, from, to, subject, attachments: [{ filename, contentType, contentBase64 }] }
 */
import { timingSafeEqual } from "node:crypto";
import type { IntakeAdapter, IntakeEnvelope, IntakeResult } from "./types";

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const emailAdapter: IntakeAdapter = {
  kind: "email",
  async verify(req) {
    const secret = process.env.INBOUND_EMAIL_SECRET;
    if (!secret) return false;
    const given = req.headers.get("x-intake-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
    return safeEqual(given, secret);
  },
  async parse(rawBody) {
    const b = JSON.parse(rawBody) as { id?: string; messageId?: string; from?: string; to?: string | string[]; subject?: string; attachments?: { filename: string; contentType: string; contentBase64?: string; content?: string }[] };
    const to = Array.isArray(b.to) ? b.to[0] : b.to;
    const address = (to ?? "").replace(/^.*<([^>]+)>.*$/, "$1").trim().toLowerCase();
    const from = (b.from ?? "").replace(/^.*<([^>]+)>.*$/, "$1").trim().toLowerCase();
    const env: IntakeEnvelope = {
      kind: "email",
      address,
      from,
      externalId: String(b.id ?? b.messageId ?? `${from}:${Date.now()}`),
      subject: b.subject ?? null,
      files: (b.attachments ?? []).map((a) => ({ name: a.filename, mime: a.contentType, data: Buffer.from(a.contentBase64 ?? a.content ?? "", "base64") })),
      rawMeta: { subject: b.subject, to, from },
    };
    return [env];
  },
  async reply(_env: IntakeEnvelope, _result: IntakeResult) {
    /* email replies are optional (Phase 2 notifications) */
  },
};
