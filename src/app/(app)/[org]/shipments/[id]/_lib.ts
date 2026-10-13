import { getDb } from "@/db/client";
import { requireOrg, type OrgContext } from "@/lib/org";
import { loadShipmentFull, type ShipmentFull } from "@/lib/shipments/queries";

export type ShipmentPageCtx = { ctx: OrgContext; full: ShipmentFull; base: string; canEdit: boolean };

export async function shipmentPage(params: Promise<{ org: string; id: string }>): Promise<ShipmentPageCtx> {
  const { org, id } = await params;
  const ctx = await requireOrg(org);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, id);
  return { ctx, full, base: `/${ctx.org.slug}/shipments/${id}`, canEdit: ctx.role !== "viewer" };
}
