import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input } from "@/components/ui/primitives";
import { SubmitButton, Explain } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { loadGuide } from "@/lib/content/guide";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { shipmentPage } from "../_lib";
import { markImportedAction, setAssessmentAction, toggleChecklistAction } from "../../actions";

export default async function EcustomsPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const db = await getDb();
  const guide = await loadGuide("xml-import");
  const checklist = await ensureChecklist(db, ctx.org.id, full.shipment.id, "ecustoms_import");
  const imported = markImportedAction.bind(null, ctx.org.slug, full.shipment.id);
  const assess = setAssessmentAction.bind(null, ctx.org.slug, full.shipment.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, full.shipment.id);
  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="ecustoms" />
      <h2 className="text-lg font-semibold">{t("ecustomsTitle")}</h2>
      <Alert tone="info">აპი არ წარადგენს დეკლარაციას და არ ინახავს eCustoms-ის პაროლს. ყველა ქმედება eCustoms-ში შენია.</Alert>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="pt-5">
            <GuideView blocks={guide} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("checklist")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Checklist checklist={checklist} canEdit={canEdit} onToggle={toggle} />
              {canEdit && full.shipment.status !== "imported_to_ecustoms" && full.shipment.status !== "assessed" ? (
                <form action={imported} className="mt-3">
                  <SubmitButton variant="secondary" size="sm">
                    {t("markImported")}
                  </SubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <Explain term="assessment">{t("assessmentNumber")}</Explain>
              </CardTitle>
              <CardDescription>{t("assessmentHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form action={assess} className="flex items-end gap-2">
                  <Field label={t("assessmentNumber")} className="flex-1">
                    <Input name="assessmentNumber" defaultValue={full.shipment.assessmentNumber ?? ""} placeholder="A 12345" required data-testid="assessment" />
                  </Field>
                  <SubmitButton data-testid="save-assessment">{t("openStep")} →</SubmitButton>
                </form>
              ) : (
                <p className="num text-lg">{full.shipment.assessmentNumber ?? "—"}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
