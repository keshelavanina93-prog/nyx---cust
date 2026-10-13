"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ListFilter, Package, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardHeader, CardTitle, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { useRegisterCommands, type CommandPaletteItem } from "@/components/command-palette";
import { STATUS_GROUPS, STATUS_GROUP_KEYS, type StatusGroup } from "@/components/dashboard/status-groups";
import { STATUS_TONE } from "@/lib/shipments/status";
import { cn } from "@/lib/utils";

export type DashRow = {
  id: string;
  reference: string;
  supplier: string | null;
  status: string;
  createdLabel: string;
  /** pre-formatted money strings (null = no calculation yet) */
  totalPayable: string | null;
  brokerSaving: string | null;
  penaltyLabel: string | null;
  penaltyIsZero: boolean;
};

type Filter = "all" | StatusGroup;

const FILTER_LABEL: Record<Filter, "filterAll" | "filterDraft" | "filterWorking" | "filterAwaiting" | "filterCustoms" | "filterDone"> = {
  all: "filterAll",
  draft: "filterDraft",
  working: "filterWorking",
  awaiting: "filterAwaiting",
  customs: "filterCustoms",
  done: "filterDone",
};

/** Shipments list: status filter chips, table with row navigation, empty state and command-palette entries. */
export function ShipmentsTable({ rows, base, canCreate }: { rows: DashRow[]; base: string; canCreate: boolean }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const router = useRouter();
  const statusLabel = (status: string) => (ts.has(status as never) ? ts(status as never) : status);
  const [filter, setFilter] = React.useState<Filter>("all");

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, draft: 0, working: 0, awaiting: 0, customs: 0, done: 0 };
    for (const r of rows) for (const g of STATUS_GROUP_KEYS) if ((STATUS_GROUPS[g] as readonly string[]).includes(r.status)) c[g]++;
    return c;
  }, [rows]);

  const visible = React.useMemo(() => (filter === "all" ? rows : rows.filter((r) => (STATUS_GROUPS[filter] as readonly string[]).includes(r.status))), [rows, filter]);

  const commands: CommandPaletteItem[] = [
    ...(rows.length
      ? (["all", ...STATUS_GROUP_KEYS] as Filter[]).map((f) => ({
          id: `dash-filter-${f}`,
          label: t("filterCommand", { status: t(FILTER_LABEL[f]) }),
          group: t("cmdFilters"),
          icon: <ListFilter aria-hidden />,
          keywords: [t(FILTER_LABEL[f])],
          onSelect: () => setFilter(f),
        }))
      : []),
    ...rows.slice(0, 25).map((r) => ({
      id: `dash-shipment-${r.id}`,
      label: t("openShipment", { ref: r.reference }),
      href: `${base}/shipments/${r.id}`,
      group: t("cmdShipments"),
      icon: <Package aria-hidden />,
      keywords: [r.reference, r.supplier ?? "", statusLabel(r.status)],
    })),
  ];
  useRegisterCommands(commands);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<PackagePlus aria-hidden />}
        title={t("emptyTitle")}
        description={t("emptyDesc")}
        action={
          canCreate ? (
            <Button asChild>
              <Link href={`${base}/shipments/new`}>
                <PackagePlus aria-hidden />
                {tn("newShipment")}
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{t("listTitle")}</CardTitle>
          <span className="num text-sm text-muted-foreground" aria-live="polite">
            {t("shipmentsCount", { shown: visible.length, total: rows.length })}
          </span>
        </div>
        <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
          {(["all", ...STATUS_GROUP_KEYS] as Filter[])
            .filter((f) => f === "all" || counts[f] > 0 || f === filter)
            .map((f) => {
              const pressed = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                    pressed ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {t(FILTER_LABEL[f])}
                  <span className={cn("num rounded-full px-1.5 text-xs", pressed ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>{counts[f]}</span>
                </button>
              );
            })}
        </div>
      </CardHeader>
      {visible.length === 0 ? (
        <p className="border-t px-5 py-10 text-center text-sm text-muted-foreground">{t("noMatches")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("reference")}</Th>
              <Th className="hidden sm:table-cell">{t("supplier")}</Th>
              <Th className="text-right">{t("totalPayable")}</Th>
              <Th className="hidden text-right md:table-cell">{t("vsBroker")}</Th>
              <Th className="hidden text-right lg:table-cell">{t("penaltyRisk")}</Th>
              <Th className="hidden md:table-cell">{t("created")}</Th>
              <Th>{tc("status")}</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const href = `${base}/shipments/${s.id}`;
              return (
                <tr
                  key={s.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a,button")) return;
                    router.push(href);
                  }}
                >
                  <Td>
                    <Link href={href} className="font-medium text-primary underline-offset-2 hover:underline focus-visible:rounded-sm">
                      {s.reference}
                    </Link>
                  </Td>
                  <Td className="hidden text-muted-foreground sm:table-cell">{s.supplier ?? "—"}</Td>
                  <Td className="num text-right">{s.totalPayable ?? "—"}</Td>
                  <Td className="num hidden text-right text-success md:table-cell">{s.brokerSaving ? `−${s.brokerSaving}` : "—"}</Td>
                  <Td className="num hidden text-right lg:table-cell">
                    {s.penaltyLabel === null ? "—" : <Badge tone={s.penaltyIsZero ? "ok" : "warn"}>{s.penaltyLabel}</Badge>}
                  </Td>
                  <Td className="num hidden text-muted-foreground md:table-cell">{s.createdLabel}</Td>
                  <Td>
                    <Badge dot tone={STATUS_TONE[s.status] ?? "neutral"}>
                      {statusLabel(s.status)}
                    </Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
