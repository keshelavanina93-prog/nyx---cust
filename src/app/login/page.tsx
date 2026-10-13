import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { FlaskConical, Mail, ShieldCheck } from "lucide-react";
import { authFeatures } from "@/lib/auth";
import { currentUser } from "@/lib/org";
import { Alert, Badge, Card, CardContent, Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/marketing/auth-shell";
import { BrandMark } from "@/components/marketing/brand";
import { devLoginAction, googleAction, magicLinkAction } from "./actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const user = await currentUser();
  if (user) redirect("/");
  const t = await getTranslations("auth");
  const sp = await searchParams;
  const any = authFeatures.devLogin || authFeatures.magicLink || authFeatures.google;
  const primaryProviders = authFeatures.magicLink || authFeatures.google;
  return (
    <AuthShell>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-12 rounded-xl [&_svg]:size-6" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("loginSub")}</p>
        </div>
      </div>
      <Card className="shadow-lift">
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          {sp.sent ? <Alert tone="ok">{t("sent")}</Alert> : null}
          {sp.error ? <Alert tone="danger">{sp.error}</Alert> : null}
          {!any ? <Alert tone="warn">{t("noProviders")}</Alert> : null}
          {authFeatures.google ? (
            <form action={googleAction}>
              <Button variant="secondary" type="submit" className="w-full">
                <GoogleIcon />
                {t("google")}
              </Button>
            </form>
          ) : null}
          {authFeatures.google && authFeatures.magicLink ? (
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              {t("or")}
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}
          {authFeatures.magicLink ? (
            <form action={magicLinkAction} className="space-y-3">
              <Field label={t("email")}>
                <Input name="email" type="email" required autoComplete="email" />
              </Field>
              <SubmitButton className="w-full">
                <Mail aria-hidden />
                {t("magicLink")}
              </SubmitButton>
            </form>
          ) : null}
          {authFeatures.devLogin ? (
            <>
              {primaryProviders ? <div className="h-px bg-border" aria-hidden /> : null}
              <form action={devLoginAction} className="space-y-3 rounded-lg border-2 border-dashed border-warning/50 bg-warning/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-warning">
                    <FlaskConical className="size-4" aria-hidden />
                    {t("devLogin")}
                  </span>
                  <Badge tone="warn" dot>
                    {t("devBadge")}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80">{t("devHint")}</p>
                <Field label={t("email")}>
                  <Input name="email" type="email" required defaultValue="demo@example.com" data-testid="dev-email" />
                </Field>
                <SubmitButton className="w-full" variant="secondary" data-testid="dev-login">
                  {t("devLogin")}
                </SubmitButton>
              </form>
            </>
          ) : null}
        </CardContent>
      </Card>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        {t("noPassword")}
      </p>
    </AuthShell>
  );
}
