/**
 * FX rates. Rule [VERIFIED, Customs Code art.8]: the NBG official rate on the day the customs
 * declaration is registered. Endpoint [UNVERIFIED] — `NBG_RATES_URL` (default is the commonly used
 * nbg.gov.ge JSON gateway; verify on nbg.gov.ge). Parsing is tolerant; failures surface to the user
 * who can enter a rate manually with a source note (audited).
 */
import Decimal from "decimal.js";
import { D } from "@/lib/money";

export type FxRateRow = { id?: string; currency: string; date: string; rateGel: string; quantity: number; source: "manual" | "nbg"; note?: string | null };

export type NbgCurrency = { code: string; quantity: number; rate: number; date?: string; validFromDate?: string; name?: string };

/** NBG gateway returns `[ { date, currencies: [ { code, quantity, rate, ... } ] } ]` [UNVERIFIED shape]. */
export function parseNbgPayload(payload: unknown, isoDate: string): FxRateRow[] {
  const arr = Array.isArray(payload) ? payload : [payload];
  const out: FxRateRow[] = [];
  for (const entry of arr) {
    const e = entry as { date?: string; currencies?: NbgCurrency[] } | null;
    const list = e?.currencies ?? (Array.isArray(entry) ? (entry as NbgCurrency[]) : []);
    for (const c of list ?? []) {
      if (!c?.code || typeof c.rate !== "number") continue;
      out.push({ currency: String(c.code).toUpperCase(), date: isoDate, rateGel: new Decimal(c.rate).toFixed(6), quantity: Number(c.quantity ?? 1) || 1, source: "nbg" });
    }
  }
  return out;
}

export async function fetchNbgRates(isoDate: string, baseUrl = process.env.NBG_RATES_URL): Promise<FxRateRow[]> {
  if (!baseUrl) throw new Error("NBG_RATES_URL not configured");
  const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}date=${isoDate}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 0 } } as RequestInit);
  if (!res.ok) throw new Error(`NBG responded ${res.status}`);
  const json = await res.json();
  const rows = parseNbgPayload(json, isoDate);
  if (rows.length === 0) throw new Error("NBG payload contained no rates");
  return rows;
}

/** Build a converter from a rate table. Rates are "GEL per `quantity` units of currency". */
export function makeFxConverter(rates: FxRateRow[]) {
  const map = new Map(rates.map((r) => [r.currency.toUpperCase(), r]));
  return {
    convert(amount: Decimal.Value, currency: string): Decimal {
      const cur = currency.toUpperCase();
      if (cur === "GEL") return D(amount);
      const r = map.get(cur);
      if (!r) throw new Error(`FX rate missing for ${cur}`);
      return D(amount).mul(r.rateGel).div(r.quantity);
    },
    get(currency: string) {
      return map.get(currency.toUpperCase());
    },
    has(currency: string) {
      return currency.toUpperCase() === "GEL" || map.has(currency.toUpperCase());
    },
  };
}

export type FxConverterObject = ReturnType<typeof makeFxConverter>;
