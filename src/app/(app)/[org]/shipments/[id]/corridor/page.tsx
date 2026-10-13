import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input, Select } from "@/components/ui/primitives";
import { SubmitButton, Explain } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { loadGuide } from "@/lib/content/guide";
import { shipmentPage } from "../_lib";
import { setCorridorAction, rsAdjustedAction, toggleChecklistAction } from "../../actions";

export default async function CorridorPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const guide = await loadGuide("corridor");
  await getDb();
  const s = full.shipment;
  const setCorridor = setCorridorAction.bind(null, ctx.org.slug, s.id);
  const rsAdj = rsAdjustedAction.bind(null, ctx.org.slug, s.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, s.id);
  const lists = full.checklists.filter((c) => ["yellow_corridor", "red_corridor_physical", "red_corridor_value"].includes(c.kind));
  const showValue = s.corridor === "red" && s.redReason === "value";
  return (
    <div className="space-y-4">
      <Stepper base={base} status={s.status} current="corridor" />
      <h2 className="text-lg font-semibold">
        <Explain term="corridor">{t("corridorTitle")}</Explain>
      </h2>
      <Alert tone="info">{t("corridorHint")}</Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("corridor")}</CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form action={setCorridor} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label={t("corridor")}>
                    <Select name="corridor" defaultValue={s.corridor ?? "green"} data-testid="corridor">
                      <option value="green">{t("green")}</option>
                      <option value="blue">{t("blue")}</option>
                      <option value="yellow">{t("yellow")}</option>
                      <option value="red">{t("red")}</option>
                    </Select>
                  </Field>
                  <Field label={t("redReason")}>
                    <Select name="redReason" defaultValue={s.redReason ?? "unknown"}>
                      <option value="physical">{t("physical")}</option>
                      <option value="value">{t("value")}</option>
                      <option value="documents">{t("documents")}</option>
                      <option value="unknown">{t("unknown")}</option>
                    </Select>
                  </Field>
                  <div className="self-end">
                    <SubmitButton data-testid="save-corridor">{t("saveCorridor")}</SubmitButton>
                  </div>
                </form>
              ) : (
                <p>{s.corridor ?? "—"}</p>
              )}
            </CardContent>
          </Card>
          {lists.map((c) => (
            <Card key={c.id} className={c.kind === "red_corridor_value" ? "border-red-300" : c.kind === "yellow_corridor" ? "border-amber-300" : undefined}>
              <CardHeader>
                <CardTitle>{c.kind}</CardTitle>
                {c.kind === "red_corridor_value" ? <CardDescription>{t("appealNote")}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                <Checklist checklist={c} canEdit={canEdit} onToggle={toggle} />
                <a href={`${base}/sheet`} className="mt-2 inline-block text-sm text-brand-600 underline">
                  {c.kind === "red_corridor_value" ? t("evidencePackage") : t("docsPackage")} (ფურცელი + დოკუმენტები)
                </a>
              </CardContent>
            </Card>
          ))}
          {showValue && canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("rsAdjusted")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={rsAdj} className="flex items-end gap-2">
                  <Field label="₾">
                    <Input name="rsAdjustedValueGel" inputMode="decimal" defaultValue={s.rsAdjustedValueGel ?? ""} required />
                  </Field>
                  <SubmitButton variant="secondary">{t("rsAdjustedSave")}</SubmitButton>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <Card>
          <CardContent className="pt-5">
            <GuideView blocks={guide} />
          </CardContent>
        </Card>
      </div>
      <a href={`${base}/close`} className="inline-block text-sm text-brand-600 underline">
        {t("closeTitle")} →
      </a>
    </div>
  );
}
