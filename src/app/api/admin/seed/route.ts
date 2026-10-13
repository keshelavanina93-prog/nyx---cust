import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "@/db/client";
import { seedReference } from "@/db/seed/reference";
import { importTariffCsv, getActiveTariffVersion } from "@/lib/tariff/import";
import { audit } from "@/lib/audit/log";
import { safeEqual } from "@/lib/intake/email";

/**
 * One-off operational seed for hosted environments (Cloud Run has no tsx/scripts at runtime).
 * POST /api/admin/seed  with  Authorization: Bearer <CRON_SECRET>
 * Idempotent: reference data + placeholder tariff only if no active tariff exists. Never creates users.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  await seedReference(db);
  let tariff = await getActiveTariffVersion(db);
  let imported = false;
  if (!tariff) {
    const csv = await fs.readFile(path.join(process.cwd(), "src/db/seed/tariff.placeholder.csv"), "utf8");
    await importTariffCsv(db, csv, { source: "tariff.placeholder.csv (PLACEHOLDER — NOT REAL TARIFF DATA)", effectiveFrom: "2026-01-01" });
    tariff = await getActiveTariffVersion(db);
    imported = true;
  }
  await audit({ organizationId: null, actorType: "system", entity: "app", action: "seed", after: { imported, tariff: tariff?.source } }, db);
  return NextResponse.json({ ok: true, referenceData: true, tariff: { source: tariff?.source, placeholder: tariff?.isPlaceholder, imported } });
}
