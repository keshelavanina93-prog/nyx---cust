import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, FolderArchive, Route, Scale, ShieldAlert, TriangleAlert } from "lucide-react";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input, Stat } from "@/components/ui/primitives";
import { SubmitButton, Explain } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { GuidePage, CardIconTitle } from "@/components/guide/guide-layout";
import { CorridorChooser } from "@/components/guide/corridor-chooser";
import { ToastForm } from "@/components/guide/toast-form";
import { loadGuide } from "@/lib/content/guide";
import { formatGel } from "@/lib/money";
import { shipmentPage } from "../_lib";
import { setCorridorAction, rsAdjustedAction, toggleChecklistAction } from "../../actions";

const LIST_KINDS = ["yellow_corridor", "red_corridor_physical", "red_corridor_value"] as const;
type ListKind = (typeof LIST_KINDS)[number];
const isListKind = (k: string): k is ListKind => (LIST_KINDS as readonly string[]).includes(k);
const CORRIDOR_TONE = { green: "ok", blue: "info", yellow: "warn", red: "danger" } as const;

export default async function CorridorPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const tf = await getTranslations("flow");
  const guide = await loadGuide("corridor");
  const s = full.shipment;
  const setCorridor = setCorridorAction.bind(null, ctx.org.slug, s.id);
  const rsAdj = rsAdjustedAction.bind(null, ctx.org.slug, s.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, s.id);
  const lists = full.checklists.flatMap((c) => (isListKind(c.kind) ? [{ ...c, kind: c.kind }] : []));
  const showValue = s.corridor === "red" && s.redReason === "value";
  const hasValueList = lists.some((c) => c.kind === "red_corridor_value");
  const declared = full.calculation?.customsValueGel ?? null;
  const delta = s.rsAdjustedValueGel && declared ? Number(s.rsAdjustedValueGel) - Number(declared) : null;

  return (
    <GuidePage
      stepper={<Stepper base={base} status={s.status} current="corridor" />}
      icon={<Route />}
      title={<Explain term="corridor">{t("corridorTitle")}</Explain>}
      badge={s.corridor ? <Badge tone={CORRIDOR_TONE[s.corridor]} dot>{t(s.corridor)}</Badge> : null}
      notice={t("corridorHint")}
      guide={<GuideView blocks={guide} />}
      aside={
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<Route />}>{t("corridor")}</CardIconTitle>
              </CardTitle>
              <CardDescription>{tf("corridorPick")}</CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <CorridorChooser action={setCorridor} initialCorridor={s.corridor} initialRedReason={s.redReason} />
              ) : s.corridor ? (
                <Badge tone={CORRIDOR_TONE[s.corridor]} dot>
                  {t(s.corridor)}
                  {s.corridor === "red" && s.redReason ? ` · ${t(s.redReason)}` : ""}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">{tf("corridorNotRecorded")}</p>
              )}
            </CardContent>
          </Card>

          {lists.map((c) => {
            const value = c.kind === "red_corridor_value";
            const yellow = c.kind === "yellow_corridor";
            return (
              <Card key={c.id} className={value || c.kind === "red_corridor_physical" ? "border-danger/40" : "border-warning/40"}>
                <CardHeader>
                  <CardTitle>
                    <CardIconTitle icon={yellow ? <TriangleAlert /> : <ShieldAlert />}>{tf(`kind.${c.kind}`)}</CardIconTitle>
                  </CardTitle>
                  {value ? <CardDescription>{t("appealNote")}</CardDescription> : null}
                </CardHeader>
                <CardContent>
                  <Checklist checklist={c} canEdit={canEdit} onToggle={toggle} />
                </CardContent>
              </Card>
            );
          })}

          {lists.length ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <CardIconTitle icon={<FolderArchive />}>{hasValueList ? t("evidencePackage") : t("docsPackage")}</CardIconTitle>
                </CardTitle>
                <CardDescription>{tf("evidenceHint")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`${base}/sheet`}>{tf("evidenceSheet")}</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${base}/intake`}>{tf("evidenceDocs")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {showValue && canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <CardIconTitle icon={<Scale />}>{t("rsAdjusted")}</CardIconTitle>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label={tf("declaredValue")} value={declared ? formatGel(declared) : "—"} />
                  <Stat
                    label={tf("adjustedValue")}
                    value={s.rsAdjustedValueGel ? formatGel(s.rsAdjustedValueGel) : "—"}
                    tone={delta !== null && delta > 0 ? "warn" : "neutral"}
                    hint={delta !== null ? `${delta > 0 ? "+" : ""}${formatGel(delta)}` : undefined}
                  />
                </div>
                <ToastForm action={rsAdj} success={tf("rsSaved")} failure={tf("saveFailed")} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Field label="₾" className="flex-1">
                    <Input name="rsAdjustedValueGel" inputMode="decimal" defaultValue={s.rsAdjustedValueGel ?? ""} required className="num text-base" />
                  </Field>
                  <SubmitButton variant="secondary">{t("rsAdjustedSave")}</SubmitButton>
                </ToastForm>
                <Alert tone="info" className="text-xs">
                  {tf("rsNote")}
                </Alert>
              </CardContent>
            </Card>
          ) : null}
        </>
      }
      footer={
        <div className="no-print flex justify-end">
          <Button asChild>
            <Link href={`${base}/close`}>
              {t("closeTitle")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      }
    />
  );
}
