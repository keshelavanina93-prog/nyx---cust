import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { audit } from "@/lib/audit/log";

/** Organization data export (owner) — JSON of all tenant tables (brief §9). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrg(slug, ["owner"]);
  const db = await getDb();
  const id = ctx.org.id;
  const data = {
    organization: ctx.org,
    suppliers: await db.select().from(schema.suppliers).where(eq(schema.suppliers.organizationId, id)),
    shipments: await db.select().from(schema.shipments).where(eq(schema.shipments.organizationId, id)),
    documents: await db.select().from(schema.documents).where(eq(schema.documents.organizationId, id)),
    invoiceLines: await db.select().from(schema.invoiceLines).where(eq(schema.invoiceLines.organizationId, id)),
    hsDecisions: await db.select().from(schema.hsDecisions).where(eq(schema.hsDecisions.organizationId, id)),
    calculations: await db.select().from(schema.calculations).where(eq(schema.calculations.organizationId, id)),
    exports: await db.select().from(schema.exportsTable).where(eq(schema.exportsTable.organizationId, id)),
    checklists: await db.select().from(schema.checklists).where(eq(schema.checklists.organizationId, id)),
    clientMemory: await db.select().from(schema.clientMemory).where(eq(schema.clientMemory.organizationId, id)),
    priceReferences: await db.select().from(schema.priceReferences).where(eq(schema.priceReferences.organizationId, id)),
    ecustomsProfile: await db.query.ecustomsProfiles.findFirst({ where: eq(schema.ecustomsProfiles.organizationId, id) }),
    auditLog: await db.select().from(schema.auditLog).where(eq(schema.auditLog.organizationId, id)),
  };
  await audit({ organizationId: id, actorType: "user", actorId: ctx.user.id, entity: "organizations", entityId: id, action: "data_export" });
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${slug}-export.json"` } });
}
