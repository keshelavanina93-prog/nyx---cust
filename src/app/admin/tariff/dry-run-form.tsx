"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, Checkbox, Field, Input, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { TARIFF_COLUMNS } from "@/lib/tariff/csv";
import type { DryRunState } from "../actions";

export function DryRunForm({ dryRun, importAction }: { dryRun: (prev: DryRunState, fd: FormData) => Promise<DryRunState>; importAction: (fd: FormData) => Promise<void> }) {
  const [state, action] = useActionState(dryRun, {} as DryRunState);
  const [showMap, setShowMap] = React.useState(false);
  const r = state.report;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1 · Dry run</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-3">
            <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
            <button type="button" className="block text-xs text-brand-600 underline" onClick={() => setShowMap((s) => !s)}>
              column mapping
            </button>
            {showMap ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {TARIFF_COLUMNS.map((c) => (
                  <Field key={c} label={c}>
                    <Input name={`map:${c}`} placeholder={c} className="h-8" />
                  </Field>
                ))}
              </div>
            ) : null}
            <SubmitButton variant="secondary">Dry run</SubmitButton>
          </form>
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        </CardContent>
      </Card>
      {r ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              2 · Report {r.isPlaceholder ? <Badge tone="danger">PLACEHOLDER</Badge> : <Badge tone="ok">real</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              rows {r.total} · valid {r.total - r.errors.length - r.duplicates.length} · errors {r.errors.length} · duplicates {r.duplicates.length} · chapters {r.hierarchy.chapters} / headings {r.hierarchy.headings} / subheadings {r.hierarchy.subheadings}
            </div>
            {r.errors.length ? (
              <div className="max-h-48 overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">
                {r.errors.slice(0, 50).map((e) => (
                  <div key={e.line}>
                    line {e.line}: {e.message}
                  </div>
                ))}
              </div>
            ) : null}
            <Table>
              <thead>
                <tr>
                  <Th>HS</Th>
                  <Th>ka</Th>
                  <Th>duty</Th>
                  <Th>vat exempt</Th>
                </tr>
              </thead>
              <tbody>
                {r.valid.map((v) => (
                  <tr key={v.hs_code}>
                    <Td className="num">{v.hs_code}</Td>
                    <Td>{v.description_ka}</Td>
                    <Td>{v.duty_rate}%</Td>
                    <Td>{String(v.vat_exempt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {r.errors.length === 0 ? (
              <form action={importAction} className="grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="fileKey" value={r.fileKey} />
                <Field label="source">
                  <Input name="source" required placeholder="RS tariff 2026 (file name / URL)" />
                </Field>
                <Field label="effective_from">
                  <Input name="effectiveFrom" type="date" required />
                </Field>
                <div className="self-end">
                  <Checkbox name="placeholder" defaultChecked={r.isPlaceholder} label="placeholder" />
                </div>
                <div className="self-end">
                  <SubmitButton>3 · Import as new version</SubmitButton>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
