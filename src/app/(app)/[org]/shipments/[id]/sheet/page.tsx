import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Alert, Badge } from "@/components/ui/primitives";
import { CopyButton, PrintButton } from "@/components/ui/client";
import { buildModelForShipment } from "@/lib/export/run";
import { buildSheet } from "@/lib/export/sheet/fields";
import { shipmentPage } from "../_lib";

export default async function SheetPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full } = await shipmentPage(params);
  const t = await getTranslations("sheet");
  const tc = await getTranslations("common");
  if (!full.calculation) return <Alert tone="warn">გამოთვლა ჯერ არ არის.</Alert>;
  const db = await getDb();
  const model = await buildModelForShipment(db, ctx.org.id, full.shipment.id);
  const sections = buildSheet(model);
  return (
    <div className="print-page mx-auto max-w-3xl rounded-lg border bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {t("title")} · {full.shipment.reference}
          </h2>
          <p className="text-xs text-slate-500">
            {model.profileVersion} · {model.generatedAt.slice(0, 16).replace("T", " ")} {model.tariffVersion.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="no-print text-xs text-slate-500">{t("printHint")}</span>
          <PrintButton label={tc("print")} />
        </div>
      </div>
      {sections.map((sec) => (
        <section key={sec.titleKa} className="mb-5 break-inside-avoid">
          <h3 className="mb-2 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">{sec.titleKa}</h3>
          <dl className="divide-y">
            {sec.fields.map((f, i) => (
              <div key={i} className="grid grid-cols-[3rem_1fr_auto] items-start gap-2 py-1.5 text-sm sm:grid-cols-[4rem_14rem_1fr_auto]">
                <dt className="num font-mono text-xs text-slate-500">{f.box}</dt>
                <dt className="text-slate-700">
                  {f.labelKa} {!f.verified ? <span className="ml-1 text-[10px] text-amber-700">[{tc("verify")}]</span> : null}
                  {f.hintKa ? <div className="text-[11px] text-slate-400">{f.hintKa}</div> : null}
                </dt>
                <dd className="num col-span-2 break-words font-medium sm:col-span-1" data-testid={`sheet-${f.box}`}>
                  {f.value}
                </dd>
                <dd className="col-start-3 sm:col-start-4">
                  <CopyButton value={f.value} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
