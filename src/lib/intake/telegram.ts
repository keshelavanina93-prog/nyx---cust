/**
 * Telegram bot adapter. Webhook auth: `X-Telegram-Bot-Api-Secret-Token` must equal TELEGRAM_WEBHOOK_SECRET.
 * `/start <code>` links a chat to an organization. Files/photos are downloaded via the Bot API.
 * No inline confirmation buttons — confirmation only in the web app (brief phase 2).
 */
import type { IntakeAdapter, IntakeEnvelope, IntakeResult } from "./types";
import { safeEqual } from "./email";

type TgUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; username?: string };
    text?: string;
    caption?: string;
    document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
    photo?: { file_id: string; file_size?: number }[];
  };
};

async function tgFetch<T>(method: string, body?: unknown): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(json.description ?? "telegram error");
  return json.result;
}

async function downloadFile(fileId: string): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const f = await tgFetch<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${f.file_path}`);
  return Buffer.from(await res.arrayBuffer());
}

export function parseTelegramUpdate(u: TgUpdate): Omit<IntakeEnvelope, "files"> & { fileIds: { id: string; name: string; mime: string }[] } | null {
  const m = u.message;
  if (!m) return null;
  const text = m.text ?? "";
  const start = text.match(/^\/start\s+(\S+)/);
  const fileIds: { id: string; name: string; mime: string }[] = [];
  if (m.document) fileIds.push({ id: m.document.file_id, name: m.document.file_name ?? `document-${m.message_id}`, mime: m.document.mime_type ?? "application/octet-stream" });
  if (m.photo?.length) {
    const best = m.photo[m.photo.length - 1]!;
    fileIds.push({ id: best.file_id, name: `photo-${m.message_id}.jpg`, mime: "image/jpeg" });
  }
  return {
    kind: "telegram",
    address: String(m.chat.id),
    from: m.from?.username ?? String(m.from?.id ?? m.chat.id),
    externalId: `${m.chat.id}:${m.message_id}`,
    subject: m.caption ?? null,
    text,
    linkCode: start?.[1] ?? null,
    rawMeta: { update_id: u.update_id, message_id: m.message_id },
    fileIds,
  };
}

export const telegramAdapter: IntakeAdapter = {
  kind: "telegram",
  async verify(req) {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) return false;
    return safeEqual(req.headers.get("x-telegram-bot-api-secret-token") ?? "", secret);
  },
  async parse(rawBody) {
    const parsed = parseTelegramUpdate(JSON.parse(rawBody) as TgUpdate);
    if (!parsed) return [];
    const { fileIds, ...rest } = parsed;
    const files = await Promise.all(fileIds.map(async (f) => ({ name: f.name, mime: f.mime, data: await downloadFile(f.id) })));
    return [{ ...rest, files }];
  },
  async reply(env: IntakeEnvelope, result: IntakeResult) {
    if (!result.replyText) return;
    await tgFetch("sendMessage", { chat_id: Number(env.address), text: result.replyText, disable_web_page_preview: true });
  },
};
