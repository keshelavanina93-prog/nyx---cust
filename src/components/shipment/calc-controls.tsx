"use client";

import * as React from "react";
import { Calculator, CloudDownload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Input } from "@/components/ui/primitives";
import { Explain, SubmitButton } from "@/components/ui/client";
import { LField } from "./lfield";

/** Registration-date picker (drives the FX date) + the main "Calculate" button. */
export function CalcControls({
  setDate,
  run,
  canEdit,
  hasCalc,
  blocked,
  registrationDate,
}: {
  setDate: (formData: FormData) => Promise<void>;
  run: () => Promise<void>;
  canEdit: boolean;
  hasCalc: boolean;
  blocked: boolean;
  registrationDate: string;
}) {
  const t = useTranslations("calc");
  const ts = useTranslations("shipment");
  if (!canEdit) return null;
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-card p-3.5 shadow-soft sm:p-4">
      <form action={setDate} className="flex flex-wrap items-end gap-2">
        <LField label={<Explain term="customsValue">{ts("registrationDate")}</Explain>}>
          <Input type="date" name="declarationRegistrationDate" defaultValue={registrationDate} className="h-10 w-44" />
        </LField>
        <SubmitButton variant="secondary" pendingText={t("calculating")}>
          {t("applyDate")}
        </SubmitButton>
      </form>
      <form action={run} className="ml-auto">
        <SubmitButton disabled={blocked} pendingText={t("calculating")} data-testid="calculate" size="lg">
          <Calculator aria-hidden />
          {hasCalc ? t("rerun") : t("run")}
        </SubmitButton>
      </form>
    </div>
  );
}

/** Inline recovery flow for a missing FX rate: fetch from NBG or enter manually. */
export function FxMissing({
  currency,
  date,
  fetchNbg,
  manual,
  canEdit,
  title,
}: {
  currency: string;
  /** ISO date the rate is missing for */
  date: string;
  fetchNbg: () => Promise<void>;
  manual: (formData: FormData) => Promise<void>;
  canEdit: boolean;
  title: string;
}) {
  const t = useTranslations("calc");
  const tc = useTranslations("common");
  return (
    <Alert tone="danger" title={title}>
      {canEdit ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-[auto_1fr] lg:items-end">
          <form action={fetchNbg}>
            <SubmitButton variant="secondary">
              <CloudDownload aria-hidden />
              {t("fetchNbg")}
            </SubmitButton>
          </form>
          <form action={manual} className="flex flex-wrap items-end gap-2 border-t border-danger/20 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <input type="hidden" name="currency" value={currency} />
            <input type="hidden" name="date" value={date} />
            <LField label={`${t("manualRate")} (${currency} → ₾)`}>
              <Input name="rateGel" inputMode="decimal" required className="w-36 bg-card" />
            </LField>
            <LField label={t("manualRateNote")}>
              <Input name="note" required className="w-60 bg-card" placeholder="nbg.gov.ge, 13.10.2026" />
            </LField>
            <SubmitButton>{tc("save")}</SubmitButton>
          </form>
        </div>
      ) : null}
    </Alert>
  );
}
