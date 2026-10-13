import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { loadShipment } from "@/lib/shipments/queries";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/primitives";
import { STATUS_TONE } from "@/lib/shipments/status";

export default async function ShipmentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const ctx = await requireOrg(org);
  const db = await getDb();
  const s = await loadShipment(db, ctx.org.id, id);
  const ts = await getTranslations("status");
  const tsh = await getTranslations("shipment");
  return (
    <AppShell ctx={ctx} active="dashboard">
      <div className="no-print mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">
          {s.reference} <span className="text-sm font-normal text-slate-500">{s.supplierNameRaw ?? ""}</span>
        </h1>
        <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{ts(s.status)}</Badge>
        <Badge tone="brand">{s.mode === "pre_arrival_self" ? "წინასწარი (82)" : s.mode === "post_arrival_self" ? "შემოტანის შემდეგ (54¹)" : s.mode}</Badge>
        <Link href={`/${ctx.org.slug}/shipments/${id}/sheet`} className="ml-auto text-sm text-brand-600 underline">
          {tsh("details")} · ფურცელი
        </Link>
      </div>
      {children}
    </AppShell>
  );
}
