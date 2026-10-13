"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

export async function devLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  await signIn("dev", { email, redirectTo: "/" });
}

export async function magicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  await signIn("resend", { email, redirectTo: "/" });
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
  redirect("/");
}
