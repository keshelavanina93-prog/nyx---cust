"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { audit } from "@/lib/audit/log";
import { putFile, sha256 } from "@/lib/storage";
import { loadEcustomsProfile } from "@/lib/shipments/queries";
import { ensureChecklist, toggleChecklistItem } from "@/lib/shipments/checklists";

/** Explicitly reject any field that looks like a personal number (11 digits) — never stored (brief §4). */
function rejectPersonalNumber(v: string) {
  if (/\b\d{11}\b/.test(v)) throw new Error("personal numbers must not be entered in the app — enter them directly on rs.ge");
  return v;
}

export async function saveOnboardingAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const before = await loadEcustomsProfile(db, ctx.org.id);
  const p = z
    .object({
      step: z.coerce.number().int().min(0).max(6),
      employeeName: z.string().trim().max(120).transform(rejectPersonalNumber).optional(),
      employeeInRegister: z.boolean(),
      noFeeDebtConfirmed: z.boolean(),
      offices: z.array(z.string().trim().max(10)).max(10),
      goldList: z.string().trim().max(20).optional(),
      accessStatus: z.enum(["none", "applied", "active", "expired"]).optional(),
      accessTermMonths: z.coerce.number().int().optional(),
      accessValidUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      notes: z.string().trim().max(2000).transform(rejectPersonalNumber).optional(),
    })
    .parse({
      step: formData.get("step") ?? before.wizardStep,
      employeeName: formData.get("employeeName") ?? undefined,
      employeeInRegister: formData.get("employeeInRegister") === "on",
      noFeeDebtConfirmed: formData.get("noFeeDebtConfirmed") === "on",
      offices: formData.getAll("offices").map(String),
      goldList: formData.get("goldList") ?? undefined,
      accessStatus: formData.get("accessStatus") || undefined,
      accessTermMonths: formData.get("accessTermMonths") || undefined,
      accessValidUntil: formData.get("accessValidUntil") ?? "",
      notes: formData.get("notes") ?? undefined,
    });
  const codes = [...p.offices, ...(p.goldList ? [p.goldList] : [])].filter(Boolean);
  const set = {
    wizardStep: Math.max(before.wizardStep, p.step),
    employeeName: p.employeeName ?? before.employeeName,
    employeeInRegister: p.employeeInRegister || before.employeeInRegister,
    noFeeDebtConfirmed: p.noFeeDebtConfirmed || before.noFeeDebtConfirmed,
    customsOfficeCodes: codes.length ? codes : before.customsOfficeCodes,
    accessStatus: p.accessStatus ?? before.accessStatus,
    accessTermMonths: p.accessTermMonths ?? before.accessTermMonths,
    accessValidUntil: p.accessValidUntil || before.accessValidUntil,
    applicationSubmittedAt: p.accessStatus === "applied" && !before.applicationSubmittedAt ? new Date() : before.applicationSubmittedAt,
    notes: p.notes ?? before.notes,
  };
  await db.update(schema.ecustomsProfiles).set(set).where(eq(schema.ecustomsProfiles.id, before.id));
  const cl = await ensureChecklist(db, ctx.org.id, null, "ecustoms_access");
  const mark = async (key: string, done: boolean) => {
    if (cl.items.find((i) => i.key === key)?.done !== done) await toggleChecklistItem(db, ctx.org.id, cl.id, key, done);
  };
  await mark("worth", set.wizardStep >= 1);
  await mark("register", set.employeeInRegister);
  await mark("debt", set.noFeeDebtConfirmed);
  await mark("offices", set.customsOfficeCodes.length > 0);
  await mark("applied", set.accessStatus === "applied" || set.accessStatus === "active");
  await mark("active", set.accessStatus === "active");
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "ecustoms_profiles", entityId: before.id, action: "onboarding_update", before: { step: before.wizardStep, status: before.accessStatus }, after: { step: set.wizardStep, status: set.accessStatus, offices: set.customsOfficeCodes } });
  revalidatePath(`/${ctx.org.slug}/onboarding/ecustoms`);
}

export async function uploadEmptySadAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const f = formData.get("file");
  if (!(f instanceof File) || f.size === 0) throw new Error("no file");
  if (!/\.xml$/i.test(f.name)) throw new Error("XML expected");
  const buf = Buffer.from(await f.arrayBuffer());
  const stored = await putFile(ctx.org.id, f.name, buf, "application/xml");
  const [doc] = await db.insert(schema.documents).values({ organizationId: ctx.org.id, shipmentId: null, kind: "sad_xml_sample", fileName: f.name, blobUrl: stored.url, mime: "application/xml", sizeBytes: buf.length, source: "upload", sha256: sha256(buf), extractionStatus: "n/a" }).returning();
  const profile = await loadEcustomsProfile(db, ctx.org.id);
  await db.update(schema.ecustomsProfiles).set({ emptySadSampleDocumentId: doc!.id, wizardStep: Math.max(profile.wizardStep, 6) }).where(eq(schema.ecustomsProfiles.id, profile.id));
  const cl = await ensureChecklist(db, ctx.org.id, null, "ecustoms_access");
  await toggleChecklistItem(db, ctx.org.id, cl.id, "empty_sad", true, doc!.id);
  await audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity: "documents", entityId: doc!.id, action: "upload_sad_sample", after: { fileName: f.name } });
  revalidatePath(`/${ctx.org.slug}/onboarding/ecustoms`);
}
