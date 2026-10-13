import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Gradient logo tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-primary-foreground shadow-sm transition-transform group-hover:scale-105", className)}
    >
      <PackageCheck className="size-[18px]" />
    </span>
  );
}

/** Logo mark + app name as a link. Works in server and client components (no hooks). */
export function Brand({ href = "/", name, className, nameClassName }: { href?: string; name: string; className?: string; nameClassName?: string }) {
  return (
    <Link href={href} aria-label={name} className={cn("group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35", className)}>
      <BrandMark />
      <span className={cn("truncate text-sm font-semibold tracking-tight", nameClassName)}>{name}</span>
    </Link>
  );
}
