import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle, Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { createOrgAction } from "../actions";

export default async function NewOrgPage() {
  await requireUser();
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("createOrg")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createOrgAction} className="space-y-4">
            <Field label={t("orgName")}>
              <Input name="name" required minLength={2} data-testid="org-name" />
            </Field>
            <Field label={t("taxId")}>
              <Input name="taxId" inputMode="numeric" />
            </Field>
            <Field label={t("orgSlug")} hint="a-z, 0-9, -">
              <Input name="slug" pattern="[a-z0-9\-]*" />
            </Field>
            <SubmitButton data-testid="org-create">{t("createOrg")}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
