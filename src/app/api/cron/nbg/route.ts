import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { syncNbgRates } from "@/lib/customs/fx-db";
import { audit } from "@/lib/audit/log";
import { todayIso } from "@/lib/utils";

/** Daily NBG sync (Vercel Cron). Protected by CRON_SECRET (Authorization: Bearer). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date") ?? todayIso();
  const db = await getDb();
  try {
    const r = await syncNbgRates(db, date);
    await audit({ organizationId: null, actorType: "system", entity: "fx_rates", action: "nbg_sync", after: { date, stored: r.stored } }, db);
    return NextResponse.json({ ok: true, date, ...r });
  } catch (e) {
    await audit({ organizationId: null, actorType: "system", entity: "fx_rates", action: "nbg_sync_failed", after: { date, error: (e as Error).message } }, db);
    return NextResponse.json({ ok: false, date, error: (e as Error).message }, { status: 502 });
  }
}
