import type { Metadata, Viewport } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";

const georgian = Noto_Sans_Georgian({ subsets: ["georgian", "latin"], variable: "--font-georgian", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Customs Copilot GE", template: "%s · Customs Copilot GE" },
  description: "განაბაჟე თვითონ, ბროკერის გარეშე — eCustoms დაშვებიდან გატანამდე.",
  applicationName: "Customs Copilot GE",
  authors: [{ name: "NYXCore LLC" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d13" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={georgian.variable} suppressHydrationWarning>
      <body className="min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Tbilisi">
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
