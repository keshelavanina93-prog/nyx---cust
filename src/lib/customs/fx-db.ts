import { and, eq, desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { fetchNbgRates, type FxRateRow } from "./fx";

/** Rates for a given date: manual overrides win over NBG. */
export async function getRatesForDate(db: Db, isoDate: string): Promise<FxRateRow[]> {
  const rows = await db.select().from(schema.fxRates).where(eq(schema.fxRates.date, isoDate)).orderBy(desc(schema.fxRates.source));
  const map = new Map<string, FxRateRow>();
  for (const r of rows) {
    const existing = map.get(r.currency);
    if (!existing || r.source === "manual") map.set(r.currency, { id: r.id, currency: r.currency, date: r.date, rateGel: r.rateGel, quantity: r.quantity, source: r.source, note: r.note });
  }
  return [...map.values()];
}

/** Fetch NBG rates for a date and store them (idempotent per currency/date/source). */
export async function syncNbgRates(db: Db, isoDate: string): Promise<{ stored: number }> {
  const rows = await fetchNbgRates(isoDate);
  let stored = 0;
  for (const r of rows) {
    const exists = await db.query.fxRates.findFirst({ where: and(eq(schema.fxRates.currency, r.currency), eq(schema.fxRates.date, isoDate), eq(schema.fxRates.source, "nbg")) });
    if (exists) continue;
    await db.insert(schema.fxRates).values({ currency: r.currency, date: isoDate, rateGel: r.rateGel, quantity: r.quantity, source: "nbg" });
    stored++;
  }
  return { stored };
}

export async function setManualRate(db: Db, p: { currency: string; date: string; rateGel: string; quantity?: number; note: string }) {
  const cur = p.currency.toUpperCase();
  const exists = await db.query.fxRates.findFirst({ where: and(eq(schema.fxRates.currency, cur), eq(schema.fxRates.date, p.date), eq(schema.fxRates.source, "manual")) });
  if (exists) {
    await db.update(schema.fxRates).set({ rateGel: p.rateGel, quantity: p.quantity ?? 1, note: p.note, fetchedAt: new Date() }).where(eq(schema.fxRates.id, exists.id));
    return exists.id;
  }
  const [row] = await db.insert(schema.fxRates).values({ currency: cur, date: p.date, rateGel: p.rateGel, quantity: p.quantity ?? 1, source: "manual", note: p.note }).returning({ id: schema.fxRates.id });
  return row!.id;
}
