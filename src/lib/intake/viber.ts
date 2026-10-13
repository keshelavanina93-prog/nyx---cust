/**
 * Viber bot adapter — behind FEATURE_VIBER [UNVERIFIED: Viber Bot API commercial terms].
 * Signature: `X-Viber-Content-Signature` = HMAC-SHA256(body, VIBER_AUTH_TOKEN) (hex).
 * Same contract as Telegram; replies via send_message.
 */
import { createHmac } from "node:crypto";
import type { IntakeAdapter, IntakeEnvelope, IntakeResult } from "./types";
import { safeEqual } from "./email";

type ViberEvent = {
  event: string;
  timestamp?: number;
  message_token?: number;
  sender?: { id: string; name?: string };
  message?: { type: string; text?: string; media?: string; file_name?: string; size?: number };
};

export function viberSignature(body: string, token: string): string {
  return createHmac("sha256", token).update(body).digest("hex");
}

export const viberAdapter: IntakeAdapter = {
  kind: "viber",
  async verify(req, rawBody) {
    if (process.env.FEATURE_VIBER !== "true") return false;
    const token = process.env.VIBER_AUTH_TOKEN;
    if (!token) return false;
    return safeEqual(req.headers.get("x-viber-content-signature") ?? "", viberSignature(rawBody, token));
  },
  async parse(rawBody) {
    const e = JSON.parse(rawBody) as ViberEvent;
    if (e.event !== "message" || !e.sender || !e.message) return [];
    const text = e.message.text ?? "";
    const start = text.match(/^\/start\s+(\S+)/);
    const files: IntakeEnvelope["files"] = [];
    if ((e.message.type === "file" || e.message.type === "picture") && e.message.media) {
      const res = await fetch(e.message.media);
      const data = Buffer.from(await res.arrayBuffer());
      files.push({ name: e.message.file_name ?? `viber-${e.message_token}.jpg`, mime: e.message.type === "picture" ? "image/jpeg" : (res.headers.get("content-type") ?? "application/octet-stream"), data });
    }
    return [{ kind: "viber", address: e.sender.id, from: e.sender.name ?? e.sender.id, externalId: String(e.message_token ?? `${e.sender.id}:${e.timestamp}`), text, linkCode: start?.[1] ?? null, files, rawMeta: { timestamp: e.timestamp } }];
  },
  async reply(env: IntakeEnvelope, result: IntakeResult) {
    if (!result.replyText || !process.env.VIBER_AUTH_TOKEN) return;
    await fetch("https://chatapi.viber.com/pa/send_message", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Viber-Auth-Token": process.env.VIBER_AUTH_TOKEN },
      body: JSON.stringify({ receiver: env.address, type: "text", text: result.replyText, sender: { name: "Customs Copilot GE" } }),
    });
  },
};
