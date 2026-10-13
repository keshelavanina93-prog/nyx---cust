import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getDb } from "@/db/client";
import { aiIsMock, aiProvider, getModel, modelName } from "@/lib/ai/provider";
import { extractInvoice } from "@/lib/ai/extract";
import { classifyLine } from "@/lib/ai/classify";
import { getActiveTariffVersion } from "@/lib/tariff/import";
import { safeEqual } from "@/lib/intake/email";

/**
 * Operational AI self-check (no login required, CRON_SECRET protected):
 *   GET  /api/admin/ai-check                → ping both models
 *   POST /api/admin/ai-check  (multipart "file") → run real extraction + HS classification on an invoice
 * Nothing is persisted except ai_runs rows (organization_id null).
 */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""), secret);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = { provider: aiProvider(), mock: aiIsMock(), location: process.env.GOOGLE_VERTEX_LOCATION ?? null };
  for (const kind of ["main", "fast"] as const) {
    const started = Date.now();
    try {
      const r = await generateText({ model: getModel(kind), prompt: "Reply with the single word OK", maxOutputTokens: 5 });
      out[kind] = { model: modelName(kind), ok: true, text: r.text.trim(), ms: Date.now() - started };
    } catch (e) {
      out[kind] = { model: modelName(kind), ok: false, error: (e as Error).message.slice(0, 300), ms: Date.now() - started };
    }
  }
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ error: "multipart field 'file' required" }, { status: 400 });
  const data = Buffer.from(await f.arrayBuffer());
  const started = Date.now();
  try {
    const { extraction, aiRunId, totalsMismatch, sumOfLines } = await extractInvoice([{ name: f.name, mime: f.type || "application/pdf", data }], { organizationId: null as never, shipmentId: null });
    const db = await getDb();
    const tariff = await getActiveTariffVersion(db);
    const hs: unknown[] = [];
    if (tariff && form.get("classify") !== "false") {
      for (const l of extraction.lines.slice(0, 5)) {
        const r = await classifyLine(db, { id: `check-${l.line_no}`, descriptionRaw: l.description_raw, descriptionNormalizedKa: l.description_normalized_ka, sku: l.sku, quantity: l.quantity, unit: l.unit, originCountry: l.origin_country }, { organizationId: "00000000-0000-0000-0000-000000000000", shipmentId: null, supplierId: null, supplierName: extraction.supplier.name, tariffVersionId: tariff.id });
        hs.push({ line: l.line_no, candidates: r.candidates.map((c) => ({ hs: c.hs_code, conf: c.confidence, cited: c.citations.length > 0 })), questions: r.questionsForUser });
      }
    }
    return NextResponse.json({ ok: true, ms: Date.now() - started, aiRunId, totalsMismatch, sumOfLines, extraction, hs, tariff: tariff ? { source: tariff.source, placeholder: tariff.isPlaceholder } : null });
  } catch (e) {
    return NextResponse.json({ ok: false, ms: Date.now() - started, error: (e as Error).message.slice(0, 500) }, { status: 502 });
  }
}
