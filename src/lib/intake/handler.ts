import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { processIntake } from "./process";
import type { IntakeAdapter } from "./types";

/** Very small in-memory rate limiter per adapter (brief §9). Fluid Compute keeps instances warm, so this is useful but not a guarantee. */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimited(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  b.n++;
  return b.n > limit;
}

export function makeIntakeHandler(adapter: IntakeAdapter) {
  return async function POST(req: Request) {
    const raw = await req.text();
    if (!(await adapter.verify(req, raw))) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (rateLimited(`${adapter.kind}:${ip}`)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
    let envelopes;
    try {
      envelopes = await adapter.parse(raw, req);
    } catch (e) {
      return NextResponse.json({ error: `bad payload: ${(e as Error).message}` }, { status: 400 });
    }
    const db = await getDb();
    const results = [];
    for (const env of envelopes) {
      const r = await processIntake(db, env);
      results.push(r);
      try {
        await adapter.reply(env, r);
      } catch {
        /* reply failures are non-fatal */
      }
    }
    return NextResponse.json({ ok: true, results: results.map((r) => ({ status: r.status, shipmentId: r.shipmentId, reason: r.reason })) });
  };
}
