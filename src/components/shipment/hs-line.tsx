"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge, Card, CardContent, CardHeader, CardTitle, ConfidenceBar, Field, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { formatGel } from "@/lib/money";
import type { HsCandidate } from "@/db/schema";

export type HsLineProps = {
  orgSlug: string;
  shipmentId: string;
  line: { id: string; lineNo: number; descriptionRaw: string; descriptionNormalizedKa: string | null; quantity: string; unit: string | null };
  decision: {
    candidates: HsCandidate[];
    questionsForUser: string[];
    suggestedHsCode: string | null;
    source: "ai" | "client_memory" | "manual";
    memoryTimesConfirmed: number | null;
    finalHsCode: string | null;
    humanConfirmed: boolean;
    confirmedAt: string | null;
    confirmedByName: string | null;
    penaltyExposureGel: string | null;
    advanceRulingRecommended: boolean;
  } | null;
  thresholds: { yellow: number; red: number };
  canEdit: boolean;
  rsFees: { label: string; fee: string }[];
  actions: {
    confirm: (lineId: string, hsCode: string) => Promise<void>;
    unconfirm: (lineId: string) => Promise<void>;
    manual: (formData: FormData) => Promise<void>;
    reclassify: (lineId: string) => Promise<void>;
  };
};

export function HsLine({ line, decision, thresholds, canEdit, actions, rsFees }: HsLineProps) {
  const t = useTranslations("hs");
  const [manual, setManual] = React.useState(false);
  const [pending, start] = React.useTransition();
  const top = decision?.candidates[0];
  const conf = top?.confidence ?? 0;
  const tone = decision?.humanConfirmed ? "ok" : conf < thresholds.red ? "danger" : conf < thresholds.yellow ? "warn" : "ok";

  return (
    <Card className={tone === "warn" ? "border-amber-300" : tone === "danger" ? "border-red-300" : decision?.humanConfirmed ? "border-green-300" : undefined} data-testid={`hs-line-${line.lineNo}`}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>
            <span className="num mr-2 text-slate-400">#{line.lineNo}</span>
            {line.descriptionNormalizedKa ?? line.descriptionRaw}
          </CardTitle>
          <p className="text-xs text-slate-500">
            {line.descriptionRaw} · {line.quantity} {line.unit ?? ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {decision?.humanConfirmed ? (
            <Badge tone="ok" data-testid="confirmed-badge">
              {t("confirmed")}: {decision.finalHsCode}
            </Badge>
          ) : tone === "danger" ? (
            <Badge tone="danger">{t("red")}</Badge>
          ) : tone === "warn" ? (
            <Badge tone="warn">{t("yellow")}</Badge>
          ) : null}
          {decision?.source === "client_memory" && decision.memoryTimesConfirmed ? <Badge tone="brand">{t("memoryBadge", { n: decision.memoryTimesConfirmed })}</Badge> : null}
          {decision?.penaltyExposureGel ? (
            <Badge tone={Number(decision.penaltyExposureGel) > 0 ? "warn" : "ok"} title={t("penaltyHint")}>
              {t("penaltyExposure")}: {formatGel(decision.penaltyExposureGel)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {decision?.humanConfirmed ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-600">{t("confirmedBy", { name: decision.confirmedByName ?? "—", date: decision.confirmedAt ?? "" })}</span>
            {canEdit ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => actions.unconfirm(line.id))}>
                {t("otherCode")}
              </Button>
            ) : null}
          </div>
        ) : null}

        {!decision || decision.candidates.length === 0 ? (
          <p className="text-sm text-slate-600">{t("noCandidates")}</p>
        ) : !decision.humanConfirmed ? (
          <div className="grid gap-3 md:grid-cols-3">
            {decision.candidates.map((c, i) => (
              <div key={c.hs_code + i} className={`rounded-md border p-3 text-sm ${i === 0 ? "border-brand-500 bg-brand-50/40" : "bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className="num text-base font-semibold">{c.hs_code}</span>
                  <Badge>
                    {t("duty")} {c.duty_rate}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-700">{c.description_ka}</p>
                <div className="mt-2">
                  <ConfidenceBar value={c.confidence} yellow={thresholds.yellow} red={thresholds.red} />
                </div>
                <p className="mt-2 text-xs">
                  <span className="font-medium">{t("reasoning")}:</span> {c.reasoning_ka}
                </p>
                {c.citations.length ? (
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-medium">{t("citation")}:</span> „{c.citations[0]!.quote}“
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-red-700">{t("noCitation")}</p>
                )}
                {c.why_not_others_ka ? (
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium">{t("whyNotOthers")}:</span> {c.why_not_others_ka}
                  </p>
                ) : null}
                {c.gri_rules.length ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {t("gri")}: {c.gri_rules.join(", ")}
                  </p>
                ) : null}
                {canEdit ? (
                  <Button size="sm" className="mt-2 w-full" variant={i === 0 ? "default" : "secondary"} disabled={pending} onClick={() => start(() => actions.confirm(line.id, c.hs_code))} data-testid={`confirm-${line.lineNo}-${i}`}>
                    {t("confirm")} {c.hs_code}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {decision && !decision.humanConfirmed && conf < thresholds.red ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {t("advanceRuling")}
            <ul className="mt-1 list-disc pl-4">
              {rsFees.map((f) => (
                <li key={f.label}>
                  {f.label}: {f.fee}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {decision && !decision.humanConfirmed && decision.questionsForUser.length ? (
          <div className="text-xs text-slate-600">
            <span className="font-medium">{t("questions")}:</span> {decision.questionsForUser.join(" · ")}
          </div>
        ) : null}

        {canEdit && !decision?.humanConfirmed ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setManual((m) => !m)}>
              {t("otherCode")}
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => actions.reclassify(line.id))}>
              {t("reclassify")}
            </Button>
          </div>
        ) : null}
        {manual && canEdit ? (
          <form action={actions.manual} className="grid gap-2 rounded-md border bg-slate-50 p-3 sm:grid-cols-[1fr_2fr_auto]">
            <input type="hidden" name="lineId" value={line.id} />
            <Field label={t("searchTariff")}>
              <Input name="hsCode" placeholder="10 ციფრი" pattern="\d{10}" required inputMode="numeric" />
            </Field>
            <Field label={t("manualReason")}>
              <Textarea name="reason" required minLength={3} className="min-h-10" />
            </Field>
            <div className="self-end">
              <SubmitButton size="sm">{t("confirm")}</SubmitButton>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
