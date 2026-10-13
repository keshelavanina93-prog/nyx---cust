"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, ChevronRight, CircleHelp, ExternalLink, Pencil, Quote, RefreshCw, Sparkles, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, ConfidenceBar, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatGel } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { HsCandidate } from "@/db/schema";
import { LField } from "./lfield";

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

export type HsTone = "ok" | "warn" | "danger" | "none";

/** Review state of an *unconfirmed* line, from the top candidate's confidence. */
export function hsTone(decision: HsLineProps["decision"], thresholds: { yellow: number; red: number }): HsTone {
  if (!decision || decision.candidates.length === 0) return "none";
  const conf = decision.candidates[0]!.confidence;
  return conf < thresholds.red ? "danger" : conf < thresholds.yellow ? "warn" : "ok";
}

export function HsLine({ orgSlug, line, decision, thresholds, canEdit, actions, rsFees }: HsLineProps) {
  const t = useTranslations("hs");
  const tc = useTranslations("common");
  const [manualOpen, setManualOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [busy, setBusy] = React.useState<string | null>(null);

  // optimistic: show the line as confirmed the moment the button is pressed; reverts automatically if the action fails
  const serverConfirmed = decision?.humanConfirmed ? (decision.finalHsCode ?? "") : null;
  const [confirmedCode, setConfirmedCode] = React.useOptimistic<string | null, string | null>(serverConfirmed, (_current, next) => next);

  const tone = hsTone(decision, thresholds);
  const confirmed = confirmedCode !== null;

  function run(key: string, optimistic: string | null | undefined, fn: () => Promise<void>) {
    setBusy(key);
    start(async () => {
      if (optimistic !== undefined) setConfirmedCode(optimistic);
      try {
        await fn();
      } catch {
        toast.error(tc("errorGeneric"));
      }
    });
  }

  const stripe = confirmed ? "border-l-success" : tone === "danger" ? "border-l-danger" : tone === "warn" ? "border-l-warning" : "border-l-border";

  return (
    <Card className={cn("overflow-hidden border-l-4", stripe)} data-testid={`hs-line-${line.lineNo}`}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{line.lineNo}</span>
          <div className="min-w-0">
            <CardTitle className="text-base">{line.descriptionNormalizedKa ?? line.descriptionRaw}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {line.descriptionRaw} · <span className="num">{line.quantity}</span> {line.unit ?? ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {confirmed ? (
            <Badge tone="ok" dot data-testid="confirmed-badge">
              {t("confirmed")}: <span className="num">{confirmedCode}</span>
            </Badge>
          ) : tone === "danger" ? (
            <Badge tone="danger" dot>
              {t("red")}
            </Badge>
          ) : tone === "warn" ? (
            <Badge tone="warn" dot>
              {t("yellow")}
            </Badge>
          ) : tone === "none" ? (
            <Badge dot>{t("notClassified")}</Badge>
          ) : null}
          {decision?.source === "client_memory" && decision.memoryTimesConfirmed ? <Badge tone="brand">{t("memoryBadge", { n: decision.memoryTimesConfirmed })}</Badge> : null}
          {decision?.penaltyExposureGel ? (
            <Badge tone={Number(decision.penaltyExposureGel) > 0 ? "warn" : "ok"} title={t("penaltyHint")}>
              {t("penaltyExposure")}: <span className="num">{formatGel(decision.penaltyExposureGel)}</span>
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {confirmed ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success/25 bg-success/10 px-3.5 py-3">
            <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="num text-lg font-semibold leading-tight tracking-wide">{confirmedCode}</p>
              {decision?.humanConfirmed ? <p className="text-xs text-muted-foreground">{t("confirmedBy", { name: decision.confirmedByName ?? "—", date: decision.confirmedAt ?? "" })}</p> : null}
            </div>
            {canEdit ? (
              <Button variant="outline" size="sm" loading={pending && busy === "unconfirm"} disabled={pending} onClick={() => run("unconfirm", null, () => actions.unconfirm(line.id))}>
                <Undo2 aria-hidden />
                {t("otherCode")}
              </Button>
            ) : null}
          </div>
        ) : !decision || decision.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCandidates")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {decision.candidates.map((c, i) => (
              <CandidateCard
                key={c.hs_code + i}
                c={c}
                index={i}
                thresholds={thresholds}
                canEdit={canEdit}
                lineNo={line.lineNo}
                busy={pending && busy === c.hs_code + i}
                disabled={pending}
                onConfirm={() => run(c.hs_code + i, c.hs_code, () => actions.confirm(line.id, c.hs_code))}
              />
            ))}
          </div>
        )}

        {!confirmed && decision && decision.candidates.length > 0 && tone === "danger" ? (
          <Alert tone="danger" title={t("advanceRulingTitle")}>
            {t("advanceRuling")}
            {rsFees.length ? (
              <ul className="mt-1.5 list-disc pl-4 text-xs">
                {rsFees.map((f) => (
                  <li key={f.label}>
                    {f.label}: <span className="num">{f.fee}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}

        {!confirmed && decision && decision.questionsForUser.length ? (
          <Alert tone="info" title={t("questions")} hideIcon={false}>
            <ul className="list-disc space-y-0.5 pl-4 text-xs">
              {decision.questionsForUser.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {canEdit && !confirmed ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setManualOpen(true)}>
              <Pencil aria-hidden />
              {t("otherCode")}
            </Button>
            <Button variant="ghost" size="sm" loading={pending && busy === "reclassify"} disabled={pending} onClick={() => run("reclassify", undefined, () => actions.reclassify(line.id))}>
              <RefreshCw aria-hidden />
              {t("reclassify")}
            </Button>
          </div>
        ) : null}
      </CardContent>

      {canEdit ? (
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("manualTitle")}</DialogTitle>
              <DialogDescription>
                #{line.lineNo} · {line.descriptionNormalizedKa ?? line.descriptionRaw}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-3"
              action={async (formData: FormData) => {
                try {
                  await actions.manual(formData);
                  setManualOpen(false);
                  toast.success(t("confirmed"));
                } catch {
                  toast.error(tc("errorGeneric"));
                }
              }}
            >
              <input type="hidden" name="lineId" value={line.id} />
              <LField label={t("hsCode")} hint={t("hsCodeHint")}>
                <Input name="hsCode" placeholder={t("codePlaceholder")} pattern="\d{10}" required inputMode="numeric" autoComplete="off" className="num tracking-wider" />
              </LField>
              <Link href={`/${orgSlug}/tariff`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline">
                {t("searchTariff")}
                <ExternalLink className="size-3.5" aria-hidden />
              </Link>
              <LField label={t("manualReason")}>
                <Textarea name="reason" required minLength={3} className="min-h-20" />
              </LField>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{tc("cancel")}</Button>
                </DialogClose>
                <SubmitButton>{t("confirm")}</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </Card>
  );
}

function CandidateCard({
  c,
  index,
  thresholds,
  canEdit,
  lineNo,
  busy,
  disabled,
  onConfirm,
}: {
  c: HsCandidate;
  index: number;
  thresholds: { yellow: number; red: number };
  canEdit: boolean;
  lineNo: number;
  busy: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations("hs");
  const top = index === 0;
  return (
    <div className={cn("relative flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-sm transition-shadow hover:shadow-soft", top && "border-primary/60 ring-1 ring-primary/20")}>
      {top ? (
        <Badge tone="brand" className="absolute -top-2.5 left-3 bg-accent">
          <Sparkles className="size-3" aria-hidden />
          {t("recommended")}
        </Badge>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <span className="num text-lg font-semibold leading-tight tracking-wide">{c.hs_code}</span>
        <Badge className="shrink-0">
          {t("duty")} <span className="num">{c.duty_rate}%</span>
        </Badge>
      </div>
      {c.description_ka ? <p className="text-xs leading-snug text-foreground/90">{c.description_ka}</p> : null}
      <ConfidenceBar value={c.confidence} yellow={thresholds.yellow} red={thresholds.red} className="[&>div:first-child]:w-full [&>div:first-child]:flex-1" />
      <p className="text-xs leading-relaxed">
        <span className="font-medium">{t("reasoning")}:</span> <span className="text-muted-foreground">{c.reasoning_ka}</span>
      </p>
      {c.citations.length ? (
        <figure className="rounded-r-lg border-l-2 border-primary/50 bg-muted/60 py-1.5 pl-3 pr-2">
          <blockquote className="text-xs italic leading-relaxed text-foreground/85">
            <Quote className="mr-1 inline size-3 -translate-y-0.5 text-primary" aria-hidden />
            {c.citations[0]!.quote}
          </blockquote>
          <figcaption className="mt-0.5 text-[11px] text-muted-foreground">— {t("citation")}</figcaption>
        </figure>
      ) : (
        <p className="flex items-start gap-1.5 text-xs font-medium text-danger">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("noCitation")}
        </p>
      )}
      {c.why_not_others_ka ? (
        <details className="group text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
            <CircleHelp className="size-3.5" aria-hidden />
            {t("whyNotOthers")}
          </summary>
          <p className="mt-1.5 animate-fade-in pl-5 leading-relaxed text-muted-foreground">{c.why_not_others_ka}</p>
        </details>
      ) : null}
      {c.gri_rules.length ? (
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <span>{t("gri")}:</span>
          {c.gri_rules.map((r) => (
            <Badge key={r} className="px-1.5 py-0 text-[10px]">
              {r}
            </Badge>
          ))}
        </div>
      ) : null}
      {canEdit ? (
        <Button size="sm" className="mt-auto w-full" variant={top ? "default" : "secondary"} loading={busy} disabled={disabled} onClick={onConfirm} data-testid={`confirm-${lineNo}-${index}`}>
          {t("confirm")} <span className="num">{c.hs_code}</span>
        </Button>
      ) : null}
    </div>
  );
}
