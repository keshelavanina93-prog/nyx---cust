import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { authFeatures } from "@/lib/auth";
import { currentUser } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input, Alert } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { devLoginAction, googleAction, magicLinkAction } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const user = await currentUser();
  if (user) redirect("/");
  const t = await getTranslations("auth");
  const sp = await searchParams;
  const any = authFeatures.devLogin || authFeatures.magicLink || authFeatures.google;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>Customs Copilot GE</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sp.sent ? <Alert tone="ok">{t("sent")}</Alert> : null}
          {sp.error ? <Alert tone="danger">{sp.error}</Alert> : null}
          {!any ? <Alert tone="warn">{t("noProviders")}</Alert> : null}
          {authFeatures.magicLink ? (
            <form action={magicLinkAction} className="space-y-3">
              <Field label={t("email")}>
                <Input name="email" type="email" required autoComplete="email" />
              </Field>
              <SubmitButton className="w-full">{t("magicLink")}</SubmitButton>
            </form>
          ) : null}
          {authFeatures.google ? (
            <form action={googleAction}>
              <Button variant="secondary" type="submit" className="w-full">
                {t("google")}
              </Button>
            </form>
          ) : null}
          {authFeatures.devLogin ? (
            <form action={devLoginAction} className="space-y-3 rounded-md border border-dashed border-amber-300 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">{t("devHint")}</p>
              <Field label={t("email")}>
                <Input name="email" type="email" required defaultValue="demo@example.com" data-testid="dev-email" />
              </Field>
              <SubmitButton className="w-full" variant="secondary" data-testid="dev-login">
                {t("devLogin")}
              </SubmitButton>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
