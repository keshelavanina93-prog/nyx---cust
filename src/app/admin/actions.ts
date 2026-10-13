"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { requireUser } from "@/lib/org";
import { audit } from "@/lib/audit/log";
import { dryRun, TARIFF_COLUMNS, type TariffColumn } from "@/lib/tariff/csv";
import { importTariffCsv, activateVersion } from "@/lib/tariff/import";
import { putFile } from "@/lib/storage";

async function requireSuperadmin() {
  const u = await requireUser();
  if (!u.isSuperadmin) throw new Error("superadmin only");
  return u;
}

function mappingFrom(formData: FormData): Partial<Record<TariffColumn, string>> {
  const m: Partial<Record<TariffColumn, string>> = {};
  for (const c of TARIFF_COLUMNS) {
    const v = String(formData.get(`map:${c}`) ?? "").trim();
    if (v && v !== c) m[c] = v;
  }
  return m;
}

export type DryRunState = { report?: ReturnType<typeof dryRun> & { fileKey: string }; error?: string; imported?: { versionId: string; lineCount: number; isPlaceholder: boolean } };

export async function tariffDryRunAction(_prev: DryRunState, formData: FormData): Promise<DryRunState> {
  const user = await requireSuperadmin();
  const f = formData.get("file");
  if (!(f instanceof File) || f.size === 0) return { error: "no file" };
  const text = Buffer.from(await f.arrayBuffer()).toString("utf8");
  const mapping = mappingFrom(formData);
  const report = dryRun(text, mapping);
  const stored = await putFile("admin", `tariff-${Date.now()}.csv`, Buffer.from(text, "utf8"), "text/csv");
  await audit({ organizationId: null, actorType: "user", actorId: user.id, entity: "tariff_versions", action: "dry_run", after: { valid: report.valid.length, errors: report.errors.length, placeholder: report.isPlaceholder } });
  const { valid, ...rest } = report;
  return { report: { ...rest, valid: valid.slice(0, 20), fileKey: stored.url } };
}

export async function tariffImportAction(formData: FormData) {
  const user = await requireSuperadmin();
  const db = await getDb();
  const p = z.object({ fileKey: z.string().min(1), source: z.string().min(1), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), placeholder: z.boolean() }).parse({ fileKey: formData.get("fileKey"), source: formData.get("source"), effectiveFrom: formData.get("effectiveFrom"), placeholder: formData.get("placeholder") === "on" });
  const { getFile } = await import("@/lib/storage");
  const text = (await getFile(p.fileKey)).toString("utf8");
  const r = await importTariffCsv(db, text, { source: p.source, effectiveFrom: p.effectiveFrom, mapping: mappingFrom(formData), forcePlaceholder: p.placeholder ? true : undefined });
  await audit({ organizationId: null, actorType: "user", actorId: user.id, entity: "tariff_versions", entityId: r.versionId, action: "import", after: r });
  revalidatePath("/admin/tariff");
}

export async function activateTariffAction(versionId: string) {
  const user = await requireSuperadmin();
  const db = await getDb();
  await activateVersion(db, versionId);
  await audit({ organizationId: null, actorType: "user", actorId: user.id, entity: "tariff_versions", entityId: versionId, action: "activate" });
  revalidatePath("/admin/tariff");
}

export async function setSettingAction(key: string, value: unknown) {
  const user = await requireSuperadmin();
  const db = await getDb();
  const before = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.key, key) });
  if (before) await db.update(schema.appSettings).set({ value: value as never }).where(eq(schema.appSettings.key, key));
  else await db.insert(schema.appSettings).values({ key, value: value as never });
  await audit({ organizationId: null, actorType: "user", actorId: user.id, entity: "app_settings", entityId: key, action: "set", before: before?.value, after: value });
  revalidatePath("/admin", "layout");
}

export async function addHolidayAction(formData: FormData) {
  const user = await requireSuperadmin();
  const db = await getDb();
  const p = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().min(1).max(120) }).parse({ date: formData.get("date"), name: formData.get("name") });
  await db.insert(schema.holidays).values({ ...p, needsReverification: false });
  await audit({ organizationId: null, actorType: "user", actorId: user.id, entity: "holidays", action: "add", after: p });
  revalidatePath("/admin/fees");
}

export async function deleteHolidayAction(id: string) {
  const user = await requireSuperadmin();
  const db = await getDb();
  await db.delete(schema.holidays).where(eq(schema.holidays.id, id));
  await audit({ organizationId: null, actorType: "user", actorId: user.id, entity: "holidays", entityId: id, action: "delete" });
  revalidatePath("/admin/fees");
}
