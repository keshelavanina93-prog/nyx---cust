import * as React from "react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type BadgeProps = React.ComponentProps<typeof Badge>;

/**
 * Badge wrapper that keeps WCAG AA contrast for the "ok" tone in light mode
 * (the tinted success text is ~4.4:1 at 12px, so the label uses the foreground colour and the dot/icon carry the hue).
 */
export function StatusBadge({ tone, className, ...props }: BadgeProps) {
  return <Badge tone={tone} className={cn(tone === "ok" && "text-foreground [&_svg]:text-success", className)} {...props} />;
}
