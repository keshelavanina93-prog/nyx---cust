import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { dryRun, type TariffColumn } from "./csv";

export type ImportResult = { versionId: string; lineCount: number; isPlaceholder: boolean };

/** Import a validated CSV as a NEW tariff version (old versions are kept). Activates it. */
export async function importTariffCsv(
  db: Db,
  text: string,
  opts: { source: string; effectiveFrom: string; mapping?: Partial<Record<TariffColumn, string>>; forcePlaceholder?: boolean; activate?: boolean },
): Promise<ImportResult> {
  const report = dryRun(text, opts.mapping);
  if (report.errors.length) throw new Error(`CSV has ${report.errors.length} invalid rows; fix before import`);
  if (report.valid.length === 0) throw new Error("CSV has no valid rows");
  const checksum = createHash("sha256").update(text).digest("hex");
  const isPlaceholder = opts.forcePlaceholder ?? report.isPlaceholder;

  const existing = await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.checksum, checksum) });
  if (existing) {
    if (opts.activate !== false) await activateVersion(db, existing.id);
    return { versionId: existing.id, lineCount: existing.lineCount, isPlaceholder: existing.isPlaceholder };
  }

  const [version] = await db
    .insert(schema.tariffVersions)
    .values({ countryCode: "GE", source: opts.source, effectiveFrom: opts.effectiveFrom, isPlaceholder, checksum, lineCount: report.valid.length, isActive: false })
    .returning();
  const chunk = 200;
  for (let i = 0; i < report.valid.length; i += chunk) {
    await db.insert(schema.tariffLines).values(
      report.valid.slice(i, i + chunk).map((r) => ({
        tariffVersionId: version!.id,
        hsCode: r.hs_code,
        descriptionKa: r.description_ka,
        descriptionEn: r.description_en,
        chapterNotes: r.chapter_notes,
        headingNotes: r.heading_notes,
        dutyRate: r.duty_rate,
        dutySpecific: r.duty_specific,
        exciseRate: r.excise_rate,
        exciseSpecific: r.excise_specific,
        vatExempt: r.vat_exempt,
        requiresDocs: r.requires_docs,
        unit: r.unit,
      })),
    );
  }
  if (opts.activate !== false) await activateVersion(db, version!.id);
  return { versionId: version!.id, lineCount: report.valid.length, isPlaceholder };
}

export async function activateVersion(db: Db, versionId: string) {
  await db.update(schema.tariffVersions).set({ isActive: false }).where(eq(schema.tariffVersions.isActive, true));
  await db.update(schema.tariffVersions).set({ isActive: true }).where(eq(schema.tariffVersions.id, versionId));
}

export async function getActiveTariffVersion(db: Db) {
  return db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.isActive, true) });
}
