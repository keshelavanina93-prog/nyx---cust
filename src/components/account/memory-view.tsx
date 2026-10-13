"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Brain, Check, LineChart, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge, Card, CardContent, Field, Input, Select, Table, Th, Td } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SubmitButton, ConfirmSubmit } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToastForm } from "@/components/guide/toast-form";
import { toast } from "@/components/ui/toaster";

export type MemoryRow = {
  id: string;
  productKey: string;
  descriptionRaw: string | null;
  hsCode: string;
  timesConfirmed: number;
  lastConfirmed: string;
  deleteAction: () => Promise<void>;
};
export type ReferenceRow = {
  id: string;
  hsCode: string;
  originCountry: string | null;
  unitBasis: "per_kg" | "per_unit";
  unitPrice: string;
  observedAt: string;
  source: "own_history" | "user_reference";
  note: string | null;
  deleteAction: (() => Promise<void>) | null;
};

function TimesBadge({ n }: { n: number }) {
  const t = useTranslations("memoryUi");
  return (
    <Badge tone={n >= 3 ? "ok" : n === 2 ? "info" : "neutral"} dot className="num" title={t("timesTitle", { n })}>
      {n}×
    </Badge>
  );
}

function HsCell({ row, canEdit, update }: { row: MemoryRow; canEdit: boolean; update: (formData: FormData) => Promise<void> }) {
  const t = useTranslations("memoryUi");
  const tc = useTranslations("common");
  const [editing, setEditing] = React.useState(false);
  if (!canEdit) return <span className="num font-medium">{row.hsCode}</span>;
  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="num font-medium">{row.hsCode}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)}>
              <Pencil aria-hidden className="size-3.5" />
              <span className="sr-only">
                {t("editHs")}: {row.descriptionRaw ?? row.productKey}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("editHs")}</TooltipContent>
        </Tooltip>
      </div>
    );
  }
  return (
    <ToastForm action={update} success={t("hsSaved")} failure={t("saveFailed")} onDone={() => setEditing(false)} className="flex items-center gap-1">
      <input type="hidden" name="id" value={row.id} />
      <Input
        name="hsCode"
        defaultValue={row.hsCode}
        className="num h-8 w-36"
        pattern="\d{10}"
        inputMode="numeric"
        maxLength={10}
        required
        autoFocus
        aria-label={t("hsLabel")}
        title={t("hsHint")}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <SubmitButton size="icon" variant="ghost" className="size-8 text-success">
        <Check aria-hidden />
        <span className="sr-only">{tc("save")}</span>
      </SubmitButton>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(false)}>
        <X aria-hidden />
        <span className="sr-only">{tc("cancel")}</span>
      </Button>
    </ToastForm>
  );
}

function DeleteButton({ action, label }: { action: () => Promise<void>; label: string }) {
  const tc = useTranslations("common");
  const tm = useTranslations("memoryUi");
  return (
    <form
      action={async () => {
        await action();
        toast.success(tm("deleted"));
      }}
    >
      <ConfirmSubmit variant="ghost" size="icon" message={`${tc("delete")}: ${label}?`} className="text-danger hover:bg-danger/10">
        <Trash2 aria-hidden />
        <span className="sr-only">
          {tc("delete")}: {label}
        </span>
      </ConfirmSubmit>
    </form>
  );
}

export function MemoryView({
  memory,
  references,
  canEdit,
  update,
  addReference,
  today,
  defaultTab = "memory",
}: {
  memory: MemoryRow[];
  references: ReferenceRow[];
  canEdit: boolean;
  update: (formData: FormData) => Promise<void>;
  addReference: (formData: FormData) => Promise<void>;
  today: string;
  defaultTab?: "memory" | "references";
}) {
  const t = useTranslations("memory");
  const tm = useTranslations("memoryUi");
  const tc = useTranslations("common");
  const [dialog, setDialog] = React.useState(false);

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
        <TabsTrigger value="memory">
          <Brain aria-hidden />
          {tm("tabClient")}
          <Badge className="num ml-1 px-1.5">{memory.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="references">
          <LineChart aria-hidden />
          {tm("tabReferences")}
          <Badge className="num ml-1 px-1.5">{references.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="memory">
        {memory.length === 0 ? (
          <EmptyState icon={<Brain />} title={t("empty")} description={tm("emptyMemoryHint")} />
        ) : (
          <Card>
            <CardContent className="p-0 sm:p-0">
              <Table stickyHeader>
                <thead>
                  <tr>
                    <Th>{t("product")}</Th>
                    <Th>{t("hs")}</Th>
                    <Th>{t("times")}</Th>
                    <Th>{t("last")}</Th>
                    <Th className="text-right">
                      <span className="sr-only">{tm("actions")}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {memory.map((m) => (
                    <tr key={m.id}>
                      <Td>
                        <div className="font-medium">{m.descriptionRaw ?? m.productKey}</div>
                        <div className="text-xs text-muted-foreground">{m.productKey}</div>
                      </Td>
                      <Td>
                        <HsCell row={m} canEdit={canEdit} update={update} />
                      </Td>
                      <Td>
                        <TimesBadge n={m.timesConfirmed} />
                      </Td>
                      <Td className="num whitespace-nowrap text-muted-foreground">{m.lastConfirmed}</Td>
                      <Td className="text-right">{canEdit ? <DeleteButton action={m.deleteAction} label={m.descriptionRaw ?? m.productKey} /> : null}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="references" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-muted-foreground">{tm("referencesHint")}</p>
          {canEdit ? (
            <Button variant="secondary" onClick={() => setDialog(true)}>
              <Plus aria-hidden />
              {t("addReference")}
            </Button>
          ) : null}
        </div>
        {references.length === 0 ? (
          <EmptyState
            icon={<LineChart />}
            title={tm("emptyRefs")}
            description={tm("emptyRefsHint")}
            action={
              canEdit ? (
                <Button onClick={() => setDialog(true)}>
                  <Plus aria-hidden />
                  {t("addReference")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0 sm:p-0">
              <Table stickyHeader>
                <thead>
                  <tr>
                    <Th>{t("hs")}</Th>
                    <Th>{tm("originShort")}</Th>
                    <Th>{t("basis")}</Th>
                    <Th>{t("unitPrice")}</Th>
                    <Th>{t("observedAt")}</Th>
                    <Th>{tm("source")}</Th>
                    <Th className="text-right">
                      <span className="sr-only">{tm("actions")}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {references.map((r) => (
                    <tr key={r.id}>
                      <Td className="num font-medium">{r.hsCode}</Td>
                      <Td>{r.originCountry ? <Badge className="num">{r.originCountry}</Badge> : "—"}</Td>
                      <Td>{r.unitBasis === "per_kg" ? tm("perKg") : tm("perUnit")}</Td>
                      <Td className="num">{r.unitPrice}</Td>
                      <Td className="num whitespace-nowrap">{r.observedAt}</Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={r.source === "own_history" ? "brand" : "info"}>{r.source === "own_history" ? tm("sourceOwn") : tm("sourceManual")}</Badge>
                          {r.note ? <span className="text-xs text-muted-foreground">{r.note}</span> : null}
                        </div>
                      </Td>
                      <Td className="text-right">{canEdit && r.deleteAction ? <DeleteButton action={r.deleteAction} label={r.hsCode} /> : null}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addReference")}</DialogTitle>
            <DialogDescription>{tm("addRefHint")}</DialogDescription>
          </DialogHeader>
          <ToastForm action={addReference} success={tm("refSaved")} failure={tm("saveFailed")} onDone={() => setDialog(false)} className="grid gap-3 sm:grid-cols-2">
            <Field label={t("hs")} hint={tm("hsHint")}>
              <Input name="hsCode" pattern="\d{10}" inputMode="numeric" maxLength={10} required className="num" autoFocus />
            </Field>
            <Field label={tm("originShort")}>
              <Input name="originCountry" maxLength={2} className="uppercase" placeholder="TR" />
            </Field>
            <Field label={t("basis")}>
              <Select name="unitBasis" defaultValue="per_kg">
                <option value="per_kg">{tm("perKg")}</option>
                <option value="per_unit">{tm("perUnit")}</option>
              </Select>
            </Field>
            <Field label={t("unitPrice")}>
              <Input name="unitPriceGel" inputMode="decimal" required className="num" />
            </Field>
            <Field label={t("observedAt")}>
              <Input name="observedAt" type="date" defaultValue={today} required />
            </Field>
            <Field label={tm("note")}>
              <Input name="note" maxLength={200} />
            </Field>
            <DialogFooter className="sm:col-span-2">
              <Button variant="secondary" onClick={() => setDialog(false)}>
                {tc("cancel")}
              </Button>
              <SubmitButton>{tc("add")}</SubmitButton>
            </DialogFooter>
          </ToastForm>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
