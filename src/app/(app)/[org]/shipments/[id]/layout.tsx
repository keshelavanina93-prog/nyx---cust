import Link from "next/link";
import { CalendarClock, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { loadShipment } from "@/lib/shipments/queries";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { STATUS_TONE } from "@/lib/shipments/status";
import { fmtDate } from "@/lib/format";

export default async function ShipmentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  const ctx = await requireOrg(org);
  const db = await getDb();
  const s = await loadShipment(db, ctx.org.id, id);
  const ts = await getTranslations("status");
  const tsh = await getTranslations("shipment");
  const te = await getTranslations("export");
  const modeLabel = s.mode === "pre_arrival_self" ? tsh("modePre") : s.mode === "post_arrival_self" ? tsh("modePost") : s.mode;
  return (
    <AppShell ctx={ctx} active="dashboard">
      <PageHeader
        eyebrow={s.supplierNameRaw ?? undefined}
        title={s.reference}
        actions={
          <>
            <Badge tone={STATUS_TONE[s.status] ?? "neutral"} dot>
              {ts(s.status)}
            </Badge>
            <Badge tone="brand">{modeLabel}</Badge>
            {s.expectedArrivalDate ? (
              <Badge>
                <CalendarClock className="size-3" aria-hidden />
                <span className="num">{fmtDate(s.expectedArrivalDate)}</span>
              </Badge>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={`/${ctx.org.slug}/shipments/${id}/sheet`}>
                <FileText aria-hidden />
                {te("sheet")}
              </Link>
            </Button>
          </>
        }
        className="mb-4"
      />
      <div className="space-y-5">{children}</div>
    </AppShell>
  );
}
