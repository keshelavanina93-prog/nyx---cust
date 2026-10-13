"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { setSettingAction } from "@/app/admin/actions";

const KEY = "xml_validated_against_real_sample";

/**
 * Switch bound to `setSettingAction("xml_validated_against_real_sample", value)`.
 * Same semantics as before: persisted server-side, audit-logged, revalidates /admin.
 * Turning it ON asks for confirmation (brief §7 preconditions); turning it OFF is immediate.
 */
export function ValidatedSwitch({ initial }: { initial: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const id = React.useId();
  const [pending, startTransition] = React.useTransition();
  const [optimistic, setOptimistic] = React.useOptimistic(initial);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const commit = (next: boolean) => {
    startTransition(async () => {
      setOptimistic(next);
      try {
        await setSettingAction(KEY, next);
        toast.success(t("validatedSaved"));
      } catch {
        toast.error(t("saveFailed"));
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Switch
          id={id}
          checked={optimistic}
          disabled={pending}
          aria-describedby={`${id}-state`}
          onCheckedChange={(next) => {
            if (next) setConfirmOpen(true);
            else commit(false);
          }}
        />
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold">
          {t("validatedSwitch")}
        </label>
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
      </div>
      <p id={`${id}-state`} className="text-xs font-medium text-muted-foreground">
        {optimistic ? t("validatedOn") : t("validatedOff")}
      </p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("validatedConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("validatedConfirmBody")}</DialogDescription>
          </DialogHeader>
          <p className="rounded-lg border bg-muted/50 p-3 text-sm">{t("validatedRule")}</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                commit(true);
              }}
            >
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
