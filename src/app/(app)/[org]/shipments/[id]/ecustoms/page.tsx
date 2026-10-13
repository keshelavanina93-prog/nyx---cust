import { getTranslations } from "next-intl/server";
import { CheckCircle2, FileUp, Hash, ListChecks } from "lucide-react";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input } from "@/components/ui/primitives";
import { SubmitButton, Explain } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { GuidePage, CardIconTitle } from "@/components/guide/guide-layout";
import { ToastForm } from "@/components/guide/toast-form";
import { loadGuide } from "@/lib/content/guide";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { shipmentPage } from "../_lib";
import { markImportedAction, setAssessmentAction, toggleChecklistAction } from "../../actions";

export default async function EcustomsPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const tf = await getTranslations("flow");
  const db = await getDb();
  const guide = await loadGuide("xml-import");
  const checklist = await ensureChecklist(db, ctx.org.id, full.shipment.id, "ecustoms_import");
  const imported = markImportedAction.bind(null, ctx.org.slug, full.shipment.id);
  const assess = setAssessmentAction.bind(null, ctx.org.slug, full.shipment.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, full.shipment.id);
  const status = full.shipment.status;
  const isImported = status === "imported_to_ecustoms" || status === "assessed";
  const assessment = full.shipment.assessmentNumber;

  return (
    <GuidePage
      stepper={<Stepper base={base} status={status} current="ecustoms" />}
      icon={<FileUp />}
      title={t("ecustomsTitle")}
      description={tf("ecustomsIntro")}
      badge={assessment ? <Badge tone="ok" dot className="num">{assessment}</Badge> : null}
      notice={tf("ecustomsNotice")}
      guide={<GuideView blocks={guide} />}
      aside={
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<ListChecks />}>{t("checklist")}</CardIconTitle>
              </CardTitle>
              <CardDescription>{tf("ecustomsChecklistHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Checklist checklist={checklist} canEdit={canEdit} onToggle={toggle} />
              {isImported ? (
                <Badge tone="ok" dot>
                  <CheckCircle2 aria-hidden className="size-3.5" />
                  {tf("importedDone")}
                </Badge>
              ) : canEdit ? (
                <ToastForm action={imported} success={tf("importedSaved")} failure={tf("saveFailed")}>
                  <SubmitButton variant="secondary" size="sm">
                    <CheckCircle2 aria-hidden />
                    {t("markImported")}
                  </SubmitButton>
                </ToastForm>
              ) : null}
            </CardContent>
          </Card>
          <Card className={assessment ? "border-success/40" : undefined}>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<Hash />}>
                  <Explain term="assessment">{t("assessmentNumber")}</Explain>
                </CardIconTitle>
              </CardTitle>
              <CardDescription>{t("assessmentHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form action={assess} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field label={t("assessmentNumber")} className="flex-1">
                    <Input name="assessmentNumber" defaultValue={assessment ?? ""} placeholder="A 12345" required className="num text-base" data-testid="assessment" />
                  </Field>
                  <SubmitButton data-testid="save-assessment">{tf("saveAssessment")}</SubmitButton>
                </form>
              ) : (
                <p className="num text-lg font-semibold">{assessment ?? "—"}</p>
              )}
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
