"use client";

import * as React from "react";
import { CalendarClock, Building2, PackagePlus, Plane, Ship, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/switch";
import { SubmitButton, Explain } from "@/components/ui/client";
import { LField } from "./lfield";
import { cn } from "@/lib/utils";

export type OfficeOption = { code: string; name: string };
export type SupplierOption = { id: string; name: string; country: string | null };

const OFFICE_DESC = {
  "11111": "office11111",
  "11112": "office11112",
  "11113": "office11113",
  "11114": "office11114",
  "69501": "office69501",
  ECEZ: "officeECEZ",
} as const;

const WINDOW_DAYS = 45;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function parseIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function fmtDmy(d: Date) {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function NewShipmentForm({ action, suppliers, offices, defaultOffice = "11111" }: { action: (formData: FormData) => Promise<void>; suppliers: SupplierOption[]; offices: OfficeOption[]; defaultOffice?: string }) {
  const t = useTranslations("shipment");
  const [arrived, setArrived] = React.useState(false);
  const [eta, setEta] = React.useState("");
  const [office, setOffice] = React.useState(defaultOffice);
  // "today" is only known on the client; stays null during SSR so the markup never mismatches
  const [today, setToday] = React.useState<Date | null>(null);
  React.useEffect(() => {
    const d = new Date();
    setToday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }, []);

  const etaDate = parseIso(eta);
  const days = etaDate && today ? Math.round((etaDate.getTime() - today.getTime()) / 86_400_000) : null;
  let timeline: { tone: "ok" | "warn" | "info"; text: string } | null = null;
  if (arrived) timeline = { tone: "info", text: t("timelineArrived") };
  else if (days === null) timeline = { tone: "info", text: t("timelineNone", { n: WINDOW_DAYS }) };
  else if (days < 0) timeline = { tone: "warn", text: t("timelinePast") };
  else if (days > WINDOW_DAYS && etaDate) {
    const from = new Date(etaDate.getTime());
    from.setDate(from.getDate() - WINDOW_DAYS);
    timeline = { tone: "warn", text: t("timelineEarly", { days, n: WINDOW_DAYS, date: fmtDmy(from) }) };
  } else timeline = { tone: "ok", text: days === 0 ? t("timelineToday") : t("timelineOk", { days, n: WINDOW_DAYS }) };

  const toneBox = { ok: "border-success/30 bg-success/10", warn: "border-warning/35 bg-warning/10", info: "border-border bg-muted/60" } as const;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="size-4 text-primary" aria-hidden />
              {t("sectionBasics")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <LField label={t("reference")} hint={t("referenceHint")}>
              <Input name="reference" required autoFocus autoComplete="off" placeholder="TR-2026-014" data-testid="ref" />
            </LField>
            <LField label={t("supplier")}>
              <Select name="supplierId" defaultValue="">
                <option value="">{t("noSupplier")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.country ? `(${s.country})` : ""}
                  </option>
                ))}
              </Select>
            </LField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" aria-hidden />
              <Explain term="cez">{t("destinationOffice")}</Explain>
            </CardTitle>
            <CardDescription>{t("officeHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset>
              <legend className="sr-only">{t("destinationOffice")}</legend>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {offices.map((o) => {
                  const value = o.code === "ECEZ" ? "" : o.code;
                  const checked = office === o.code;
                  const descKey = OFFICE_DESC[o.code as keyof typeof OFFICE_DESC];
                  return (
                    <label
                      key={o.code}
                      className={cn(
                        "group relative flex cursor-pointer flex-col gap-1 rounded-xl border bg-card p-3.5 transition-[border-color,box-shadow,background-color] hover:border-primary/50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/35",
                        checked && "border-primary bg-accent shadow-soft",
                      )}
                    >
                      <input type="radio" name="destinationOffice" value={value} checked={checked} onChange={() => setOffice(o.code)} className="sr-only" />
                      <span className="flex items-center justify-between gap-2">
                        <span className="num rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground">{o.code}</span>
                        <span aria-hidden className={cn("size-4 rounded-full border-2 transition-all", checked ? "border-primary bg-primary shadow-[inset_0_0_0_3px_var(--accent)]" : "border-input")} />
                      </span>
                      <span className="text-sm font-semibold leading-tight">{o.name}</span>
                      {descKey ? <span className="text-xs leading-snug text-muted-foreground">{t(descKey)}</span> : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              {t("sectionArrival")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/40 p-3.5">
              <div className="min-w-0">
                <label id="goods-arrived-label" htmlFor="goods-arrived" className="block cursor-pointer text-sm font-medium">
                  {t("goodsArrived")}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("goodsArrivedHint")}</p>
              </div>
              <Switch id="goods-arrived" name="goodsArrived" checked={arrived} onCheckedChange={setArrived} aria-labelledby="goods-arrived-label" />
            </div>
            <LField label={t("expectedArrival")}>
              <Input name="expectedArrival" type="date" value={eta} onChange={(e) => setEta(e.target.value)} className="sm:max-w-56" />
            </LField>
            {timeline ? (
              <div role="status" className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors", toneBox[timeline.tone])}>
                <Info className={cn("mt-0.5 size-4 shrink-0", timeline.tone === "ok" ? "text-success" : timeline.tone === "warn" ? "text-warning" : "text-muted-foreground")} aria-hidden />
                <span>{timeline.text}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <Card className="overflow-hidden">
          <div className={cn("h-1 w-full transition-colors", arrived ? "bg-info" : "bg-primary")} aria-hidden />
          <CardHeader>
            <CardDescription className="text-xs font-medium uppercase tracking-wide">{t("modePreview")}</CardDescription>
            <div key={arrived ? "post" : "pre"} className="animate-pop-in">
              <Badge tone={arrived ? "info" : "brand"} dot className="text-sm">
                {arrived ? <Ship className="size-3.5" aria-hidden /> : <Plane className="size-3.5" aria-hidden />}
                {arrived ? t("modePost") : t("modePre")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p key={arrived ? "post-d" : "pre-d"} className="animate-fade-in text-sm text-muted-foreground">
              {arrived ? t("modePostDesc") : t("modePreDesc")}
            </p>
            <SubmitButton size="lg" className="w-full" pendingText={t("creating")} data-testid="create-shipment">
              {t("create")}
            </SubmitButton>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
