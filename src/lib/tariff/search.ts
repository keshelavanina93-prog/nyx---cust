/**
 * Tariff retrieval for HS classification: Postgres full-text (simple config) over ka/en descriptions,
 * with prefix matching and a trigram-free fallback (ILIKE) for short queries. Returns top N lines of the
 * ACTIVE tariff version only.
 */
import { and, eq, sql, ilike, or, desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";

export type TariffHit = typeof schema.tariffLines.$inferSelect & { rank: number };

const STOP = new Set(["and", "the", "of", "for", "with", "pcs", "pc", "set", "და", "ან", "ის"]);

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

export async function searchTariff(db: Db, query: string, limit = 30, versionId?: string): Promise<TariffHit[]> {
  const version = versionId ? { id: versionId } : await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.isActive, true) });
  if (!version) return [];
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // OR-ed prefix query: "linen:* | cotton:*"
  const tsq = tokens.map((t) => `${t.replace(/[:&|!()'\\]/g, "")}:*`).join(" | ");
  const rankExpr = sql<number>`ts_rank(${schema.tariffLines.searchVector}, to_tsquery('simple', ${tsq}))`;
  const rows = await db
    .select({ line: schema.tariffLines, rank: rankExpr })
    .from(schema.tariffLines)
    .where(and(eq(schema.tariffLines.tariffVersionId, version.id), sql`${schema.tariffLines.searchVector} @@ to_tsquery('simple', ${tsq})`))
    .orderBy(desc(rankExpr))
    .limit(limit);
  let hits: TariffHit[] = rows.map((r) => ({ ...r.line, rank: Number(r.rank) }));

  if (hits.length < 5) {
    // Fallback: ILIKE on each token (handles stems FTS 'simple' misses)
    const likes = tokens.slice(0, 4).map((t) => or(ilike(schema.tariffLines.descriptionEn, `%${t}%`), ilike(schema.tariffLines.descriptionKa, `%${t}%`), ilike(schema.tariffLines.hsCode, `${t}%`)));
    const extra = await db
      .select()
      .from(schema.tariffLines)
      .where(and(eq(schema.tariffLines.tariffVersionId, version.id), or(...likes)))
      .limit(limit);
    const seen = new Set(hits.map((h) => h.id));
    for (const e of extra) if (!seen.has(e.id)) hits.push({ ...e, rank: 0.01 });
    hits = hits.slice(0, limit);
  }
  return hits;
}

export async function getTariffLineByCode(db: Db, hsCode: string, versionId: string) {
  return db.query.tariffLines.findFirst({ where: and(eq(schema.tariffLines.tariffVersionId, versionId), eq(schema.tariffLines.hsCode, hsCode)) });
}
