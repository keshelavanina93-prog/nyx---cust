import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/org";
import { Card, CardContent, Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { AuthShell } from "@/components/marketing/auth-shell";
import { createOrgAction } from "../actions";

export default async function NewOrgPage() {
  await requireUser();
  const t = await getTranslations("auth");
  return (
    <AuthShell>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-sm">
          <Building2 className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("createOrg")}</h1>
          <p className="text-sm text-muted-foreground">{t("createOrgSub")}</p>
        </div>
      </div>
      <Card className="shadow-lift">
        <CardContent className="pt-4 sm:pt-5">
          <form action={createOrgAction} className="space-y-4">
            <Field label={t("orgName")}>
              <Input name="name" required minLength={2} autoComplete="organization" data-testid="org-name" />
            </Field>
            <Field label={t("taxId")}>
              <Input name="taxId" inputMode="numeric" />
            </Field>
            <Field label={t("orgSlug")} hint={t("slugHint")}>
              <Input name="slug" pattern="[a-z0-9\-]*" />
            </Field>
            <SubmitButton className="w-full" data-testid="org-create">
              {t("createOrg")}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
