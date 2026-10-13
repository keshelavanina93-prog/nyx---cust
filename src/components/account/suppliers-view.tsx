"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Card, CardContent, Field, Input, Select, Table, Th, Td } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SubmitButton, ConfirmSubmit } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToastForm } from "@/components/guide/toast-form";
import { toast } from "@/components/ui/toaster";

export type SupplierRow = {
  id: string;
  name: string;
  country: string | null;
  address: string | null;
  taxId: string | null;
  defaultIncoterm: string | null;
  defaultCurrency: string | null;
  defaultOriginCountry: string | null;
  deleteAction: () => Promise<void>;
};

export function SuppliersView({ rows, canEdit, upsert, incoterms }: { rows: SupplierRow[]; canEdit: boolean; upsert: (formData: FormData) => Promise<void>; incoterms: string[] }) {
  const t = useTranslations("suppliers");
  const tu = useTranslations("suppliersUi");
  const tc = useTranslations("common");
  const [q, setQ] = React.useState("");
  const [sheet, setSheet] = React.useState<{ open: boolean; supplier: SupplierRow | null }>({ open: false, supplier: null });
  const needle = q.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => [r.name, r.country, r.taxId, r.defaultCurrency, r.defaultIncoterm].some((v) => v?.toLowerCase().includes(needle))) : rows;
  const openAdd = () => setSheet({ open: true, supplier: null });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tu("search")} aria-label={tu("search")} className="pl-9" />
        </div>
        <Badge tone="neutral" className="num">
          {tu("count", { n: shown.length })}
        </Badge>
        {canEdit ? (
          <Button onClick={openAdd} className="ml-auto">
            <Plus aria-hidden />
            {t("add")}
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={t("empty")}
          description={tu("emptyHint")}
          action={
            canEdit ? (
              <Button onClick={openAdd}>
                <Plus aria-hidden />
                {t("add")}
              </Button>
            ) : undefined
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={<Search />} title={tu("noMatch")} description={tu("noMatchHint")} action={<Button variant="secondary" onClick={() => setQ("")}>{tu("clear")}</Button>} />
      ) : (
        <Card>
          <CardContent className="p-0 sm:p-0">
            <Table stickyHeader>
              <thead>
                <tr>
                  <Th>{t("name")}</Th>
                  <Th>{t("country")}</Th>
                  <Th>{t("incoterm")}</Th>
                  <Th>{t("currency")}</Th>
                  <Th>{t("origin")}</Th>
                  <Th className="text-right">
                    <span className="sr-only">{tc("actions")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="font-medium">{s.name}</div>
                      {s.taxId || s.address ? <div className="max-w-xs truncate text-xs text-muted-foreground">{[s.taxId, s.address].filter(Boolean).join(" · ")}</div> : null}
                    </Td>
                    <Td>{s.country ? <Badge className="num">{s.country}</Badge> : "—"}</Td>
                    <Td>{s.defaultIncoterm ? <Badge tone="brand">{s.defaultIncoterm}</Badge> : "—"}</Td>
                    <Td className="num">{s.defaultCurrency ?? "—"}</Td>
                    <Td>{s.defaultOriginCountry ? <Badge className="num">{s.defaultOriginCountry}</Badge> : "—"}</Td>
                    <Td>
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSheet({ open: true, supplier: s })}>
                                <Pencil aria-hidden />
                                <span className="sr-only">
                                  {tc("edit")}: {s.name}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tc("edit")}</TooltipContent>
                          </Tooltip>
                          <form
                            action={async () => {
                              await s.deleteAction();
                              toast.success(tu("deleted"));
                            }}
                          >
                            <ConfirmSubmit variant="ghost" size="icon" message={`${tc("delete")} ${s.name}?`} className="text-danger hover:bg-danger/10">
                              <Trash2 aria-hidden />
                              <span className="sr-only">
                                {tc("delete")}: {s.name}
                              </span>
                            </ConfirmSubmit>
                          </form>
                        </div>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Sheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{sheet.supplier ? tu("editTitle") : t("add")}</SheetTitle>
            <SheetDescription>{tu("sheetHint")}</SheetDescription>
          </SheetHeader>
          <ToastForm
            key={sheet.supplier?.id ?? "new"}
            action={upsert}
            success={tu("saved")}
            failure={tu("saveFailed")}
            onDone={() => setSheet((s) => ({ ...s, open: false }))}
            className="grid gap-3 sm:grid-cols-2"
          >
            {sheet.supplier ? <input type="hidden" name="id" value={sheet.supplier.id} /> : null}
            <Field label={t("name")} className="sm:col-span-2">
              <Input name="name" required minLength={2} defaultValue={sheet.supplier?.name ?? ""} autoFocus />
            </Field>
            <Field label={t("country")}>
              <Input name="country" maxLength={2} placeholder="TR" defaultValue={sheet.supplier?.country ?? ""} className="uppercase" />
            </Field>
            <Field label={t("taxId")}>
              <Input name="taxId" defaultValue={sheet.supplier?.taxId ?? ""} />
            </Field>
            <Field label={t("incoterm")}>
              <Select name="defaultIncoterm" defaultValue={sheet.supplier?.defaultIncoterm ?? ""}>
                <option value="">—</option>
                {incoterms.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("currency")}>
              <Input name="defaultCurrency" maxLength={3} placeholder="USD" defaultValue={sheet.supplier?.defaultCurrency ?? ""} className="uppercase" />
            </Field>
            <Field label={t("origin")}>
              <Input name="defaultOriginCountry" maxLength={2} defaultValue={sheet.supplier?.defaultOriginCountry ?? ""} className="uppercase" />
            </Field>
            <Field label={t("address")}>
              <Input name="address" defaultValue={sheet.supplier?.address ?? ""} />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <SubmitButton>{sheet.supplier ? tc("save") : tc("add")}</SubmitButton>
              <Button variant="secondary" onClick={() => setSheet((s) => ({ ...s, open: false }))}>
                {tc("cancel")}
              </Button>
            </div>
          </ToastForm>
        </SheetContent>
      </Sheet>
    </div>
  );
}
