import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9Ⴀ-ჿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `org-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayIso(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
