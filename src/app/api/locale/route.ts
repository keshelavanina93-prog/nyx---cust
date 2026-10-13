import { NextResponse } from "next/server";
import { LOCALES } from "@/i18n/request";

export async function POST(req: Request) {
  const form = await req.formData();
  const locale = String(form.get("locale") ?? "ka");
  const referer = req.headers.get("referer") ?? "/";
  const res = NextResponse.redirect(referer, { status: 303 });
  if ((LOCALES as readonly string[]).includes(locale)) {
    res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}
