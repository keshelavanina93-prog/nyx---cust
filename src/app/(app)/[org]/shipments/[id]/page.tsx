import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { loadShipment } from "@/lib/shipments/queries";
import { STEPS, stepIndexForStatus } from "@/lib/shipments/status";

export default async function ShipmentIndex({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const ctx = await requireOrg(org);
  const db = await getDb();
  const s = await loadShipment(db, ctx.org.id, id);
  redirect(`/${ctx.org.slug}/shipments/${id}/${STEPS[stepIndexForStatus(s.status)]}`);
}
