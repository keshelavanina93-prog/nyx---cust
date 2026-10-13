"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Trash2 } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Table, Td, Th } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmSubmit, SubmitButton } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { addHolidayAction, deleteHolidayAction } from "@/app/admin/actions";
import { ReverifyBadge } from "./reverify-badge";

export type FeeMode = "pre_arrival_self" | "pre_arrival_rs_staff_electronic" | "pre_arrival_rs_staff_paper" | "post_arrival_self" | "post_arrival_rs_staff";
export type FeeRow = { id: string; mode: FeeMode; min: string; max: string | null; fee: string; doubles: boolean; legalRef: string; needsReverification: boolean; effective: string };
/** weekday (0=Sun..6=Sat) -> "10:00–18:00" or null when closed */
export type HoursRow = { office: string | null; days: Record<number, string | null> };
export type HolidayRow = { id: string; dateLabel: string; name: string; needsReverification: boolean };
export type ServiceFeeRow = { id: string; kind: "rs" | "access"; label: string; months?: number; amount: string; legalRef: string };
export type PenaltyRow = { id: string; rule: string; percent: string; threshold: string | null; legalRef: string };

const MODE_KEYS = {
  pre_arrival_self: "modePreSelf",
  pre_arrival_rs_staff_electronic: "modePreRsElectronic",
  pre_arrival_rs_staff_paper: "modePreRsPaper",
  post_arrival_self: "modePostSelf",
  post_arrival_rs_staff: "modePostRs",
} as const;

const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_KEYS = { 0: "wd0", 1: "wd1", 2: "wd2", 3: "wd3", 4: "wd4", 5: "wd5", 6: "wd6" } as const;

export function FeesTabs({ fees, hours, holidays, serviceFees, penalties }: { fees: FeeRow[]; hours: HoursRow[]; holidays: HolidayRow[]; serviceFees: ServiceFeeRow[]; penalties: PenaltyRow[] }) {
  const t = useTranslations("admin");
  const tabs = [
    { value: "fees", label: t("tabFeeSchedules"), count: fees.length },
    { value: "hours", label: t("tabWorkingHours"), count: hours.length },
    { value: "holidays", label: t("holidays"), count: holidays.length },
    { value: "service", label: t("tabRsAccess"), count: serviceFees.length },
    { value: "penalties", label: t("tabPenalties"), count: penalties.length },
  ];
  return (
    <Tabs defaultValue="fees">
      <div className="scrollbar-thin -mx-1 overflow-x-auto px-1 pb-1">
        <TabsList aria-label={t("fees")}>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className="num rounded-full bg-background/70 px-1.5 text-[11px] leading-5 text-muted-foreground">{tab.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="fees">
        <Card>
          <CardHeader>
            <CardTitle>fee_schedules</CardTitle>
            <CardDescription>{t("feeSchedulesNote")}</CardDescription>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <EmptyState title={t("noRows")} className="py-8" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("colMode")}</Th>
                    <Th className="text-right">{t("colMin")}</Th>
                    <Th className="text-right">{t("colMax")}</Th>
                    <Th className="text-right">{t("colFee")}</Th>
                    <Th>{t("colOffHours")}</Th>
                    <Th>{t("colLegalRef")}</Th>
                    <Th>{t("colEffective")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((f) => (
                    <tr key={f.id}>
                      <Td className="min-w-48">{t(MODE_KEYS[f.mode])}</Td>
                      <Td className="num text-right">{f.min}</Td>
                      <Td className="num text-right">{f.max ?? t("unlimited")}</Td>
                      <Td className="num text-right font-medium">{f.fee}</Td>
                      <Td>{f.doubles ? <Badge tone="warn">×2</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                      <Td className="min-w-48 text-xs">
                        <div className="space-y-1">
                          <span>{f.legalRef}</span>
                          {f.needsReverification ? (
                            <div>
                              <ReverifyBadge />
                            </div>
                          ) : null}
                        </div>
                      </Td>
                      <Td className="num whitespace-nowrap">{f.effective}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hours">
        <Card>
          <CardHeader>
            <CardTitle>working_hours</CardTitle>
          </CardHeader>
          <CardContent>
            {hours.length === 0 ? (
              <EmptyState title={t("noRows")} className="py-8" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("office")}</Th>
                    {WEEK.map((d) => (
                      <Th key={d}>{t(WEEKDAY_KEYS[d])}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.office ?? "default"}>
                      <Td className="font-medium">{h.office ?? t("defaultOffice")}</Td>
                      {WEEK.map((d) => (
                        <Td key={d} className="num whitespace-nowrap text-xs">
                          {h.days[d] ?? <span className="text-muted-foreground">{t("closed")}</span>}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="holidays">
        <HolidaysPanel holidays={holidays} />
      </TabsContent>

      <TabsContent value="service">
        <Card>
          <CardHeader>
            <CardTitle>rs_service_fees · ecustoms_access_fees</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceFees.length === 0 ? (
              <EmptyState title={t("noRows")} className="py-8" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("colLabel")}</Th>
                    <Th className="text-right">{t("colAmount")}</Th>
                    <Th>{t("colLegalRef")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {serviceFees.map((r) => (
                    <tr key={`${r.kind}-${r.id}`}>
                      <Td>
                        <div className="flex flex-wrap items-center gap-2">
                          {r.kind === "access" ? t("accessTerm", { months: r.months ?? 0 }) : r.label}
                          <Badge tone={r.kind === "access" ? "info" : "neutral"}>{r.kind === "access" ? t("accessFees") : t("rsFees")}</Badge>
                        </div>
                      </Td>
                      <Td className="num text-right font-medium">{r.amount}</Td>
                      <Td className="text-xs">{r.legalRef}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="penalties">
        <Card>
          <CardHeader>
            <CardTitle>penalty_rules</CardTitle>
          </CardHeader>
          <CardContent>
            {penalties.length === 0 ? (
              <EmptyState title={t("noRows")} className="py-8" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("colRule")}</Th>
                    <Th className="text-right">{t("colPercent")}</Th>
                    <Th className="text-right">{t("colThreshold")}</Th>
                    <Th>{t("colLegalRef")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((p) => (
                    <tr key={p.id}>
                      <Td>{p.rule}</Td>
                      <Td className="num text-right">{p.percent}%</Td>
                      <Td className="num text-right">{p.threshold ?? "—"}</Td>
                      <Td className="text-xs">{p.legalRef}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function HolidaysPanel({ holidays }: { holidays: HolidayRow[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t("holidays")}</CardTitle>
            <CardDescription>{t("addHolidayDesc")}</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <CalendarPlus aria-hidden />
                {t("addHoliday")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("addHoliday")}</DialogTitle>
                <DialogDescription>{t("addHolidayDesc")}</DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4"
                action={async (fd) => {
                  try {
                    await addHolidayAction(fd);
                    toast.success(t("holidayAdded"));
                    setOpen(false);
                  } catch {
                    toast.error(t("saveFailed"));
                  }
                }}
              >
                <Field label={t("fieldDate")}>
                  <Input name="date" type="date" required />
                </Field>
                <Field label={t("fieldName")}>
                  <Input name="name" required maxLength={120} autoComplete="off" />
                </Field>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      {tc("cancel")}
                    </Button>
                  </DialogClose>
                  <SubmitButton>{tc("add")}</SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {holidays.length === 0 ? (
          <EmptyState title={t("noRows")} className="py-8" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("fieldDate")}</Th>
                <Th>{t("fieldName")}</Th>
                <Th>
                  <span className="sr-only">{tc("actions")}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <Td className="num whitespace-nowrap">{h.dateLabel}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      {h.name}
                      {h.needsReverification ? <ReverifyBadge /> : null}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <form
                      action={async () => {
                        try {
                          await deleteHolidayAction(h.id);
                          toast.success(t("holidayDeleted"));
                        } catch {
                          toast.error(t("saveFailed"));
                        }
                      }}
                    >
                      <ConfirmSubmit variant="destructive" size="icon" className="bg-transparent text-danger shadow-none hover:bg-danger/10" aria-label={`${t("deleteHoliday")}: ${h.name}`} message={t("deleteHolidayConfirm", { name: h.name, date: h.dateLabel })}>
                        <Trash2 aria-hidden />
                      </ConfirmSubmit>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
