"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

/** Attestation checkbox + primary CTA. The CTA only unlocks once the declarant attested and nothing blocks approval. */
export function ApproveForm({ action, blocked }: { action: (formData: FormData) => Promise<void>; blocked: boolean }) {
  const t = useTranslations("approval");
  const [attested, setAttested] = React.useState(false);
  return (
    <form action={action} className="space-y-4">
      <Checkbox
        name="attest"
        required
        data-testid="attest"
        checked={attested}
        onChange={(e) => setAttested(e.target.checked)}
        className={cn("w-full rounded-xl border p-3.5 transition-colors", attested ? "border-success/50 bg-success/10" : "bg-muted/40 hover:border-primary/40")}
        label={t("attest")}
      />
      <SubmitButton size="lg" variant="success" className="w-full" disabled={blocked || !attested} pendingText={t("approving")} data-testid="approve">
        <ShieldCheck aria-hidden />
        {t("approve")}
      </SubmitButton>
      {!attested || blocked ? <p className="text-center text-xs text-muted-foreground">{blocked ? t("resolveBlockers") : t("attestFirst")}</p> : null}
    </form>
  );
}
