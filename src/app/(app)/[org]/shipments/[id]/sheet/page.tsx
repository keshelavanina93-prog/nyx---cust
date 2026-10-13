import { CalendarClock, Stamp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Alert, Badge } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/client";
import { SheetToolbar } from "@/components/shipment/sheet-toolbar";
import { buildModelForShipment } from "@/lib/export/run";
import { buildSheet } from "@/lib/export/sheet/fields";
import { shipmentPage } from "../_lib";

export default async function SheetPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full } = await shipmentPage(params);
  const t = await getTranslations("sheet");
  const tc = await getTranslations("common");
  if (!full.calculation) return <Alert tone="warn">{t("noCalc")}</Alert>;
  const db = await getDb();
  const model = await buildModelForShipment(db, ctx.org.id, full.shipment.id);
  const sections = buildSheet(model);
  const nav = sections.map((sec, i) => ({ id: `sheet-section-${i}`, title: sec.titleKa }));
  const copyAll = sections
    .map((sec) => [sec.titleKa, ...sec.fields.map((f) => `${f.box}\t${f.labelKa}\t${f.value}`)].join("\n"))
    .join("\n\n");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SheetToolbar sections={nav} copyAllText={copyAll} />
      <article className="print-page rounded-2xl border bg-card p-5 shadow-soft sm:p-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Stamp className="size-3.5" aria-hidden />
              {tc("appName")}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
            <p className="num text-sm text-muted-foreground">{full.shipment.reference}</p>
          </div>
          <div className="space-y-1 text-right text-xs text-muted-foreground">
            <p className="num flex items-center justify-end gap-1.5">
              <CalendarClock className="size-3.5" aria-hidden />
              {model.generatedAt.slice(0, 16).replace("T", " ")}
            </p>
            <p className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="num">{model.profileVersion}</span>
              {model.tariffVersion.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
            </p>
            <p className="no-print">{t("printHint")}</p>
          </div>
        </header>

        {sections.map((sec, si) => (
          <section key={nav[si]!.id} id={nav[si]!.id} className="mb-7 scroll-mt-36 break-inside-avoid last:mb-0">
            <h3 className="mb-1 flex items-center gap-2 border-b pb-1.5 text-sm font-semibold uppercase tracking-wide">
              <span className="num flex size-5 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground print:bg-black print:text-white">{si + 1}</span>
              {sec.titleKa}
            </h3>
            <dl className="divide-y">
              {sec.fields.map((f, i) => (
                <div key={i} className="grid grid-cols-[3.25rem_1fr_auto] items-start gap-x-3 gap-y-0.5 py-2 text-sm sm:grid-cols-[4.5rem_14rem_1fr_auto]">
                  <dt className="num mt-0.5 inline-flex h-6 min-w-9 items-center justify-center self-start rounded border bg-muted px-1.5 font-mono text-xs font-semibold">{f.box}</dt>
                  <dt className="text-foreground/90">
                    {f.labelKa}
                    {!f.verified ? <span className="ml-1.5 inline-block rounded border border-warning/40 bg-warning/10 px-1 text-[10px] font-medium text-warning">{tc("verify")}</span> : null}
                    {f.hintKa ? <div className="text-[11px] leading-snug text-muted-foreground">{f.hintKa}</div> : null}
                  </dt>
                  <dd className="num col-span-2 col-start-1 break-words font-medium sm:col-span-1 sm:col-start-3" data-testid={`sheet-${f.box}`}>
                    {f.value}
                  </dd>
                  <dd className="col-start-3 row-start-1 sm:col-start-4">
                    <CopyButton value={f.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>
    </div>
  );
}
