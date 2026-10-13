"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Decimal from "decimal.js";
import { Field, Input, Select, Card, CardContent, Stat } from "@/components/ui/primitives";
import { formatGel } from "@/lib/money";

const FEES: [number, number][] = [
  [3000, 50],
  [15000, 150],
  [Infinity, 200],
];

export function CalculatorForm() {
  const t = useTranslations("calculator");
  const tc = useTranslations("calc");
  const [value, setValue] = React.useState("5000");
  const [freight, setFreight] = React.useState("500");
  const [rate, setRate] = React.useState("2.70");
  const [duty, setDuty] = React.useState("12");
  const r = React.useMemo(() => {
    try {
      const cv = new Decimal(value || 0).plus(freight || 0).mul(rate || 0);
      const d = cv.mul(duty || 0).div(100);
      const vat = cv.plus(d).mul(18).div(100);
      const fee = FEES.find(([max]) => cv.lte(max))![1];
      return { cv, d, vat, fee: new Decimal(fee), total: d.plus(vat).plus(fee) };
    } catch {
      return null;
    }
  }, [value, freight, rate, duty]);
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
        <Field label={t("goodsValue")}>
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label={t("freight")}>
          <Input inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} />
        </Field>
        <Field label={t("rate")}>
          <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        <Field label={t("dutyRate")}>
          <Select value={duty} onChange={(e) => setDuty(e.target.value)}>
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
          </Select>
        </Field>
        {r ? (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-5">
            <Stat label={tc("customsValue")} value={formatGel(r.cv)} />
            <Stat label={tc("duty")} value={formatGel(r.d)} />
            <Stat label={tc("vat")} value={formatGel(r.vat)} />
            <Stat label={tc("fee")} value={formatGel(r.fee)} hint="№96 გრ. 82 (წინასწარი, თვითონ)" />
            <Stat label={tc("totalPayable")} value={formatGel(r.total)} tone="brand" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
