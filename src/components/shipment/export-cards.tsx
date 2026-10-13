"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileCode2, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/client";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export type ExportCardsProps = {
  sheetHref: string;
  sheetOk: boolean;
  xml: { action: () => Promise<void>; ok: boolean; disabledByFlag: boolean; validated: boolean };
  xls: { action: () => Promise<void>; ok: boolean };
  canEdit: boolean;
};

/** Generate form: runs the server action, toasts on success/failure. The toast intentionally never repeats the file name (it appears in the history). */
function GenerateForm({ action, disabled, testId, label, success }: { action: () => Promise<void>; disabled: boolean; testId: string; label: string; success: string }) {
  const t = useTranslations("export");
  const tc = useTranslations("common");
  return (
    <form
      action={async () => {
        try {
          await action();
          toast.success(success, { description: t("toastDescription") });
        } catch {
          toast.error(tc("errorGeneric"));
        }
      }}
    >
      <SubmitButton variant="secondary" disabled={disabled} pendingText={t("generating")} data-testid={testId} className="w-full">
        {label}
      </SubmitButton>
    </form>
  );
}

export function ExportCards({ sheetHref, sheetOk, xml, xls, canEdit }: ExportCardsProps) {
  const t = useTranslations("export");
  const tc = useTranslations("common");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* primary path */}
      <Card className="relative flex flex-col overflow-hidden border-primary/50 shadow-lift">
        <div aria-hidden className="h-1.5 w-full bg-gradient-to-r from-primary to-info" />
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FileText className="size-5" aria-hidden />
            </span>
            <Badge tone="brand" dot>
              {t("primaryPath")}
            </Badge>
          </div>
          <CardTitle className="pt-2 text-lg">{t("sheet")}</CardTitle>
          <CardDescription>{t("sheetD")}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          {sheetOk ? (
            <Button asChild size="lg" className="w-full">
              <Link href={sheetHref} data-testid="open-sheet">
                {t("openSheet")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled data-testid="open-sheet">
              <Lock aria-hidden />
              {t("openSheet")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* XML (experimental) */}
      <Card className={cn("flex flex-col", xml.disabledByFlag && "opacity-80")}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
              <FileCode2 className="size-5" aria-hidden />
            </span>
            {xml.validated ? (
              <Badge tone="ok" dot>
                {t("xmlValidated")}
              </Badge>
            ) : (
              <Badge tone="warn" dot>
                {tc("experimental")}
              </Badge>
            )}
          </div>
          <CardTitle className="pt-2 text-lg">{t("xml")}</CardTitle>
          <CardDescription>{xml.validated ? t("xmlValidatedD") : t("xmlD")}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          {xml.disabledByFlag ? (
            <p className="text-sm text-muted-foreground">{t("disabled")}</p>
          ) : canEdit ? (
            <GenerateForm action={xml.action} disabled={!xml.ok} testId="export-xml" label={`${t("generate")} XML`} success={t("xmlDone")} />
          ) : null}
        </CardContent>
      </Card>

      {/* XLS */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-success/15 text-success">
              <FileSpreadsheet className="size-5" aria-hidden />
            </span>
          </div>
          <CardTitle className="pt-2 text-lg">{t("xls")}</CardTitle>
          <CardDescription>{t("xlsD")}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">{canEdit ? <GenerateForm action={xls.action} disabled={!xls.ok} testId="export-xls" label={`${t("generate")} XLS`} success={t("xlsDone")} /> : null}</CardContent>
      </Card>
    </div>
  );
}
