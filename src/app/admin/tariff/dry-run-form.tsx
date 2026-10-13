"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Field, Input, Stat, Table, Td, Th } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { WizardSteps } from "@/components/admin/wizard-steps";
import { StatusBadge } from "@/components/admin/status-badge";
import { TARIFF_COLUMNS } from "@/lib/tariff/csv";
import { cn } from "@/lib/utils";
import type { DryRunState } from "../actions";

const MAX_ERRORS_SHOWN = 200;
const MAX_DUPLICATES_SHOWN = 40;

type Props = {
  dryRun: (prev: DryRunState, fd: FormData) => Promise<DryRunState>;
  importAction: (fd: FormData) => Promise<void>;
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DryRunForm(props: Props) {
  // Bumping the key remounts the wizard, which resets the useActionState result after a successful import.
  const [run, setRun] = React.useState(0);
  return <Wizard key={run} {...props} onDone={() => setRun((n) => n + 1)} />;
}

function Wizard({ dryRun, importAction, onDone }: Props & { onDone: () => void }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const fileId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  // What the last dry run was started with: the import must reuse the same column mapping.
  const [used, setUsed] = React.useState<{ fileName: string; mapping: Record<string, string> }>({ fileName: "", mapping: {} });

  const [state, action] = useActionState(async (prev: DryRunState, fd: FormData) => {
    const mapping: Record<string, string> = {};
    for (const c of TARIFF_COLUMNS) {
      const v = String(fd.get(`map:${c}`) ?? "").trim();
      if (v && v !== c) mapping[`map:${c}`] = v;
    }
    const f = fd.get("file");
    setUsed({ fileName: f instanceof File ? f.name : "", mapping });
    return dryRun(prev, fd);
  }, {} as DryRunState);

  const r = state.report;
  const valid = r ? Math.max(0, r.total - r.errors.length - r.duplicates.length) : 0;
  const step = !r ? 0 : r.errors.length === 0 ? 2 : 1;
  const steps = [
    { id: "upload", label: t("stepUpload"), description: t("stepUploadDesc") },
    { id: "report", label: t("stepReport"), description: t("stepReportDesc") },
    { id: "import", label: t("stepImport"), description: t("stepImportDesc") },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 sm:pt-5">
          <WizardSteps steps={steps} current={step} label={t("wizardLabel")} progressLabel={t("wizardProgress", { current: step + 1, total: steps.length })} />
        </CardContent>
      </Card>

      {/* 1 - upload */}
      <Card>
        <CardHeader>
          <CardTitle>1 · {t("stepUpload")}</CardTitle>
          <CardDescription>{t("tariffUpload")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} onReset={() => setFile(null)} className="space-y-4">
            <label
              htmlFor={fileId}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped && inputRef.current) {
                  inputRef.current.files = e.dataTransfer.files;
                  setFile(dropped);
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 has-[:focus-visible]:border-primary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/35",
                dragging && "border-primary bg-accent/60",
                file && "border-success/50 bg-success/5",
              )}
            >
              <input ref={inputRef} id={fileId} name="file" type="file" accept=".csv,text/csv" required className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <>
                  <FileSpreadsheet className="size-8 text-success" aria-hidden />
                  <span className="text-sm font-semibold">{file.name}</span>
                  <span className="num text-xs text-muted-foreground">{formatSize(file.size)}</span>
                  <span className="text-xs font-medium text-primary underline underline-offset-2">{t("dropChange")}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-semibold">{t("dropTitle")}</span>
                  <span className="text-xs text-muted-foreground">{t("dropHint")}</span>
                </>
              )}
            </label>

            <div>
              <button
                type="button"
                onClick={() => setShowMap((s) => !s)}
                aria-expanded={showMap}
                aria-controls={`${fileId}-map`}
                className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
              >
                <ChevronDown className={cn("size-4 transition-transform", showMap && "rotate-180")} aria-hidden />
                {t("columnMapping")}
              </button>
              <div id={`${fileId}-map`} hidden={!showMap} className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">{t("columnMappingHint")}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TARIFF_COLUMNS.map((c) => (
                    <Field key={c} label={<code className="text-xs">{c}</code>}>
                      <Input name={`map:${c}`} placeholder={c} className="h-9 font-mono text-xs" autoComplete="off" />
                    </Field>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton pendingText={t("dryRun")}>{t("dryRun")}</SubmitButton>
              {state.error ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {state.error === "no file" ? t("noFile") : state.error}
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2 - report */}
      {r ? (
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>2 · {t("reportTitle")}</CardTitle>
                <CardDescription>
                  {used.fileName ? `${used.fileName} · ` : ""}
                  {t("reportDesc", { total: r.total })}
                </CardDescription>
              </div>
              {r.isPlaceholder ? <Badge tone="danger" dot>{t("placeholderFile")}</Badge> : <StatusBadge tone="ok" dot>{t("realFile")}</StatusBadge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.isPlaceholder ? (
              <Alert tone="warn" title={t("placeholderBannerTitle")}>
                {t("placeholderBannerBody")}
              </Alert>
            ) : null}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={t("statValid")} value={valid} tone="ok" />
              <Stat label={t("statErrors")} value={r.errors.length} tone={r.errors.length > 0 ? "danger" : "neutral"} />
              <Stat label={t("statDuplicates")} value={r.duplicates.length} tone={r.duplicates.length > 0 ? "warn" : "neutral"} />
              <Stat
                label={t("statHierarchy")}
                value={`${r.hierarchy.chapters} / ${r.hierarchy.headings} / ${r.hierarchy.subheadings}`}
                hint={`${t("hierarchyChapters")} / ${t("hierarchyHeadings")} / ${t("hierarchySubheadings")}`}
              />
            </div>

            {r.errors.length > 0 ? (
              <section aria-labelledby={`${fileId}-errs`} className="space-y-2">
                <h3 id={`${fileId}-errs`} className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <AlertTriangle className="size-4" aria-hidden />
                  {t("errorsTitle")}
                </h3>
                {/* scrollable region must be keyboard focusable */}
                <div tabIndex={0} role="region" aria-labelledby={`${fileId}-errs`} className="scrollbar-thin max-h-56 overflow-auto rounded-lg border border-danger/25 bg-danger/5 p-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
                  <ul className="divide-y divide-danger/15 text-sm">
                    {r.errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                      <li key={`${e.line}-${i}`} className="flex gap-3 px-2.5 py-1.5">
                        <span className="num w-20 shrink-0 font-semibold text-danger">{t("errorLine", { line: e.line })}</span>
                        <span className="min-w-0 break-words">{e.message}</span>
                      </li>
                    ))}
                  </ul>
                  {r.errors.length > MAX_ERRORS_SHOWN ? <p className="px-2.5 py-2 text-xs text-muted-foreground">{t("errorsMore", { n: r.errors.length - MAX_ERRORS_SHOWN })}</p> : null}
                </div>
              </section>
            ) : (
              <Alert tone="ok" className="text-foreground">
                {t("noErrors")}
              </Alert>
            )}

            {r.duplicates.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t("statDuplicates")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {r.duplicates.slice(0, MAX_DUPLICATES_SHOWN).map((d) => (
                    <Badge key={d} tone="warn" className="num font-mono">
                      {d}
                    </Badge>
                  ))}
                  {r.duplicates.length > MAX_DUPLICATES_SHOWN ? <span className="text-xs text-muted-foreground">+{r.duplicates.length - MAX_DUPLICATES_SHOWN}</span> : null}
                </div>
              </section>
            ) : null}

            {r.valid.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t("sampleRows", { n: r.valid.length })}</h3>
                <Table>
                  <thead>
                    <tr>
                      <Th>{t("colHs")}</Th>
                      <Th>{t("colDescriptionKa")}</Th>
                      <Th className="text-right">{t("colDuty")}</Th>
                      <Th>{t("colVatExempt")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.valid.map((v) => (
                      <tr key={v.hs_code}>
                        <Td className="num font-mono text-xs">{v.hs_code}</Td>
                        <Td>{v.description_ka}</Td>
                        <Td className="num text-right">{v.duty_rate}%</Td>
                        <Td>{v.vat_exempt ? <StatusBadge tone="ok">{tc("yes")}</StatusBadge> : <Badge>{tc("no")}</Badge>}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </section>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* 3 - import */}
      {r ? (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>3 · {t("stepImport")}</CardTitle>
            <CardDescription>{t("stepImportDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {r.errors.length > 0 ? (
              <Alert tone="danger">{t("importBlocked")}</Alert>
            ) : (
              <form
                action={async (fd) => {
                  try {
                    await importAction(fd);
                    toast.success(t("importDone"));
                    onDone();
                  } catch {
                    toast.error(t("importFailed"));
                  }
                }}
                className="space-y-4"
              >
                <input type="hidden" name="fileKey" value={r.fileKey} />
                {Object.entries(used.mapping).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("fieldSource")}>
                    <Input name="source" required placeholder={t("sourcePlaceholder")} defaultValue={used.fileName} />
                  </Field>
                  <Field label={t("fieldEffectiveFrom")}>
                    <Input name="effectiveFrom" type="date" required />
                  </Field>
                </div>
                <Checkbox name="placeholder" defaultChecked={r.isPlaceholder} label={t("markPlaceholder")} />
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>{t("importSubmit")}</SubmitButton>
                  <Button type="button" variant="ghost" onClick={onDone}>
                    {t("startOver")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
