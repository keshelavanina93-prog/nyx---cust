import { getLocale, getTranslations } from "next-intl/server";
import { Brand } from "@/components/marketing/brand";
import { LocaleSwitch } from "@/components/ui/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

/** Centered-card layout on the app gradient, used by login, create-organization and the organization chooser. */
export async function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const tc = await getTranslations("common");
  const locale = await getLocale();
  return (
    <div className="flex min-h-dvh flex-col bg-app-gradient">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Brand name={tc("appName")} nameClassName="max-[420px]:sr-only" />
        <div className="flex items-center gap-1.5">
          <LocaleSwitch locale={locale} />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-6">
        <div className={cn("w-full animate-slide-up", wide ? "max-w-lg" : "max-w-md")}>{children}</div>
      </main>
      <footer className="px-4 pb-6 pt-2 text-center text-xs text-muted-foreground">{tc("legalLine")}</footer>
    </div>
  );
}
