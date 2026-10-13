"use client";

import * as React from "react";
import { ChevronDown, FunctionSquare, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/primitives";
import { AnimatedBar } from "@/components/ui/animated";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatGel } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BreakdownRow = {
  lineId: string;
  lineNo: number;
  hsCode: string;
  description: string;
  invoiceValueGel: string;
  freightGel: string;
  insuranceGel: string;
  otherGel: string;
  customsValue: string;
  dutyRate: string;
  duty: string;
  excise: string;
  vatBase: string;
  vat: string;
  total: string;
  penalty: string | null;
  formulas: Record<string, string>;
  /** server-rendered value-risk badge */
  risk: React.ReactNode;
};

const FORMULA_KEYS = ["invoice_value_gel", "share", "customs_value_gel", "duty", "excise", "vat", "penalty"] as const;
type FormulaKey = (typeof FORMULA_KEYS)[number];
const isFormulaKey = (k: string): k is FormulaKey => (FORMULA_KEYS as readonly string[]).includes(k);

/** Number that opens a popover with the formula used to calculate it. */
function FormulaValue({ value, formulaKeys, formulas, title }: { value: string; formulaKeys: FormulaKey[]; formulas: Record<string, string>; title: string }) {
  const t = useTranslations("calc");
  const entries = formulaKeys.filter((k) => formulas[k]);
  if (!entries.length) return <span className="num">{value}</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${title}: ${value} — ${t("showFormula")}`}
          className="num rounded px-0.5 underline decoration-muted-foreground/60 decoration-dotted underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 text-xs">
        <p className="flex items-center gap-1.5 font-semibold">
          <FunctionSquare className="size-3.5 text-primary" aria-hidden />
          {title}
        </p>
        <ul className="space-y-1.5">
          {entries.map((k) => (
            <li key={k}>
              <span className="text-muted-foreground">{t(`formula.${k}`)}</span>
              <code className="mt-0.5 block whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1 font-mono text-[11px] leading-relaxed text-foreground">{formulas[k]}</code>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Per-line breakdown: expandable rows, formula popovers on every computed number. */
export function CalcBreakdown({ rows }: { rows: BreakdownRow[] }) {
  const t = useTranslations("calc");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  const allOpen = open.size === rows.length && rows.length > 0;
  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.lineId)))}
          className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        >
          {allOpen ? t("collapseAll") : t("expandAll")}
        </button>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 rounded-l-lg bg-muted px-2 py-2.5">
                <span className="sr-only">{t("howCalculated")}</span>
              </th>
              <th className="bg-muted px-2 py-2.5">HS</th>
              <th className="bg-muted px-2 py-2.5 text-right">{t("customsValue")}</th>
              <th className="bg-muted px-2 py-2.5 text-right">{t("duty")}</th>
              <th className="bg-muted px-2 py-2.5 text-right">{t("excise")}</th>
              <th className="bg-muted px-2 py-2.5 text-right">{t("vat")}</th>
              <th className="bg-muted px-2 py-2.5 text-right">{tc("total")}</th>
              <th className="rounded-r-lg bg-muted px-2 py-2.5">{t("valueRisk")}</th>
            </tr>
          </thead>
          {rows.map((r) => {
            const isOpen = open.has(r.lineId);
            const panel = `calc-row-${r.lineId}`;
            return (
              <tbody key={r.lineId} className={cn("transition-colors", isOpen ? "bg-accent/40" : "hover:bg-accent/50")}>
                <tr>
                  <td className="border-b border-border/70 px-2 py-2.5 align-top">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panel}
                      aria-label={`${t("howCalculated")} #${r.lineNo}`}
                      onClick={() => toggle(r.lineId)}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                    >
                      <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
                    </button>
                  </td>
                  <td className="border-b border-border/70 px-2 py-2.5 align-top">
                    <div className="flex items-baseline gap-2">
                      <span className="num text-xs text-muted-foreground">#{r.lineNo}</span>
                      <span className="num font-semibold">{r.hsCode}</span>
                    </div>
                    <div className="max-w-56 truncate text-xs text-muted-foreground" title={r.description}>
                      {r.description}
                    </div>
                  </td>
                  <td className="border-b border-border/70 px-2 py-2.5 text-right align-top">
                    <FormulaValue value={formatGel(r.customsValue)} formulaKeys={["invoice_value_gel", "share", "customs_value_gel"]} formulas={r.formulas} title={t("customsValue")} />
                  </td>
                  <td className="border-b border-border/70 px-2 py-2.5 text-right align-top">
                    <FormulaValue value={formatGel(r.duty)} formulaKeys={["duty"]} formulas={r.formulas} title={t("duty")} />
                    <div className="num text-xs text-muted-foreground">{r.dutyRate}%</div>
                  </td>
                  <td className="border-b border-border/70 px-2 py-2.5 text-right align-top">
                    <FormulaValue value={formatGel(r.excise)} formulaKeys={["excise"]} formulas={r.formulas} title={t("excise")} />
                  </td>
                  <td className="border-b border-border/70 px-2 py-2.5 text-right align-top">
                    <FormulaValue value={formatGel(r.vat)} formulaKeys={["vat"]} formulas={r.formulas} title={t("vat")} />
                  </td>
                  <td className="num border-b border-border/70 px-2 py-2.5 text-right align-top font-semibold">{formatGel(r.total)}</td>
                  <td className="border-b border-border/70 px-2 py-2.5 align-top">{r.risk}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="p-0">
                    <div id={panel} inert={!isOpen} className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden">
                        <div className="grid gap-4 border-b border-border/70 px-4 py-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("customsValueBuild")}</p>
                            <dl className="num space-y-1 text-sm">
                              <Line label={t("invoiceGel")} value={r.invoiceValueGel} />
                              <Line label={t("freightShare")} value={r.freightGel} plus />
                              <Line label={t("insuranceShare")} value={r.insuranceGel} plus />
                              {Number(r.otherGel) ? <Line label={t("otherShare")} value={r.otherGel} plus /> : null}
                              <Line label={t("customsValue")} value={r.customsValue} strong />
                            </dl>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("formulasTitle")}</p>
                            <ul className="space-y-1 text-xs">
                              {Object.entries(r.formulas)
                                .filter(([k]) => k !== "invoice_value_gel")
                                .map(([k, v]) => (
                                  <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                                    <span className="shrink-0 font-medium sm:w-32">{isFormulaKey(k) ? t(`formula.${k}`) : k}</span>
                                    <code className="break-words font-mono text-[11px] text-muted-foreground">{v}</code>
                                  </li>
                                ))}
                            </ul>
                            {r.penalty && Number(r.penalty) > 0 ? (
                              <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-warning">
                                <TriangleAlert className="size-3.5" aria-hidden />
                                {t("penaltyTotal")}: <span className="num">{formatGel(r.penalty)}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

function Line({ label, value, plus, strong }: { label: string; value: string; plus?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "border-t pt-1 font-semibold")}>
      <dt className="text-muted-foreground">
        {plus ? "+ " : ""}
        {label}
      </dt>
      <dd>{formatGel(value)}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fee comparison                                                      */
/* ------------------------------------------------------------------ */
export type FeeRow = { mode: string; legalRef: string; fee: string; offHoursApplied: boolean; needsReverification: boolean };
const FEE_MODES = ["pre_arrival_self", "pre_arrival_rs_staff_electronic", "pre_arrival_rs_staff_paper", "post_arrival_self", "post_arrival_rs_staff"] as const;
const isFeeMode = (m: string): m is (typeof FEE_MODES)[number] => (FEE_MODES as readonly string[]).includes(m);

/** Horizontal bar list of the declaration fee in every mode; the ×2 marker flags off-hours doubling. */
export function FeeCompare({ rows, currentMode }: { rows: FeeRow[]; currentMode: string }) {
  const t = useTranslations("calc");
  const max = Math.max(1, ...rows.map((r) => Number(r.fee)));
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const current = r.mode === currentMode;
        return (
          <li key={r.mode} className={cn("rounded-lg px-2.5 py-2 transition-colors", current && "bg-accent")}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <span className="text-sm font-medium">{isFeeMode(r.mode) ? t(`feeModes.${r.mode}`) : r.mode}</span>
                {current ? (
                  <Badge tone="brand" className="ml-2">
                    {t("currentMode")}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                {r.offHoursApplied ? (
                  <Badge tone="warn" title={t("feeOffHours")}>
                    ×2
                  </Badge>
                ) : null}
                {r.needsReverification ? (
                  <Badge tone="neutral" title={t("feeReverify")}>
                    <TriangleAlert className="size-3" aria-hidden />
                    {t("reverify")}
                  </Badge>
                ) : null}
                <span className="num text-sm font-semibold">{formatGel(r.fee)}</span>
              </div>
            </div>
            <AnimatedBar pct={(Number(r.fee) / max) * 100} className="h-2.5 w-full" barClassName={current ? "bg-primary" : "bg-muted-foreground/70"} />
            <p className="mt-1 text-[11px] text-muted-foreground">{r.legalRef}</p>
          </li>
        );
      })}
    </ul>
  );
}
