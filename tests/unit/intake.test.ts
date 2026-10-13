import { describe, it, expect, beforeAll } from "vitest";
import { emailAdapter } from "@/lib/intake/email";
import { telegramAdapter, parseTelegramUpdate } from "@/lib/intake/telegram";
import { viberAdapter, viberSignature } from "@/lib/intake/viber";
import { rateLimited } from "@/lib/intake/handler";

beforeAll(() => {
  process.env.INBOUND_EMAIL_SECRET = "email-secret";
  process.env.TELEGRAM_WEBHOOK_SECRET = "tg-secret";
  process.env.VIBER_AUTH_TOKEN = "viber-token";
  process.env.FEATURE_VIBER = "true";
});

describe("webhook signatures", () => {
  it("email: rejects missing/wrong secret, accepts header or query", async () => {
    expect(await emailAdapter.verify(new Request("http://x/api/intake/email"), "{}")).toBe(false);
    expect(await emailAdapter.verify(new Request("http://x/api/intake/email", { headers: { "x-intake-secret": "nope" } }), "{}")).toBe(false);
    expect(await emailAdapter.verify(new Request("http://x/api/intake/email", { headers: { "x-intake-secret": "email-secret" } }), "{}")).toBe(true);
    expect(await emailAdapter.verify(new Request("http://x/api/intake/email?secret=email-secret"), "{}")).toBe(true);
  });
  it("telegram: secret token header", async () => {
    expect(await telegramAdapter.verify(new Request("http://x", { headers: { "x-telegram-bot-api-secret-token": "bad" } }), "")).toBe(false);
    expect(await telegramAdapter.verify(new Request("http://x", { headers: { "x-telegram-bot-api-secret-token": "tg-secret" } }), "")).toBe(true);
  });
  it("viber: HMAC signature + feature flag", async () => {
    const body = JSON.stringify({ event: "message" });
    const sig = viberSignature(body, "viber-token");
    expect(await viberAdapter.verify(new Request("http://x", { headers: { "x-viber-content-signature": sig } }), body)).toBe(true);
    expect(await viberAdapter.verify(new Request("http://x", { headers: { "x-viber-content-signature": "deadbeef" } }), body)).toBe(false);
    process.env.FEATURE_VIBER = "false";
    expect(await viberAdapter.verify(new Request("http://x", { headers: { "x-viber-content-signature": sig } }), body)).toBe(false);
    process.env.FEATURE_VIBER = "true";
  });
});

describe("parsers", () => {
  it("email payload → envelope", async () => {
    const [env] = await emailAdapter.parse(JSON.stringify({ id: "m1", from: "Boss <boss@a.com>", to: ["demo@in.example.com"], subject: "TR-1", attachments: [{ filename: "inv.pdf", contentType: "application/pdf", contentBase64: Buffer.from("x").toString("base64") }] }), new Request("http://x"));
    expect(env).toMatchObject({ kind: "email", address: "demo@in.example.com", from: "boss@a.com", subject: "TR-1" });
    expect(env!.files[0]!.data.toString()).toBe("x");
  });
  it("telegram update → envelope (start code, photo)", () => {
    const e = parseTelegramUpdate({ update_id: 1, message: { message_id: 7, chat: { id: 42 }, from: { id: 9, username: "nino" }, text: "/start abc123" } });
    expect(e).toMatchObject({ kind: "telegram", address: "42", from: "nino", linkCode: "abc123", externalId: "42:7" });
    const p = parseTelegramUpdate({ update_id: 2, message: { message_id: 8, chat: { id: 42 }, photo: [{ file_id: "small" }, { file_id: "big" }] } });
    expect(p?.fileIds[0]).toMatchObject({ id: "big", mime: "image/jpeg" });
  });
  it("rate limiter", () => {
    for (let i = 0; i < 3; i++) expect(rateLimited("k", 3, 60_000)).toBe(false);
    expect(rateLimited("k", 3, 60_000)).toBe(true);
  });
});
