"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

type ProgressTone = "primary" | "success" | "warning" | "danger" | "info";
const toneBar: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

function Progress({ className, value, tone = "primary", ...props }: React.ComponentProps<typeof ProgressPrimitive.Root> & { tone?: ProgressTone }) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} value={value} {...props}>
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 rounded-full transition-transform duration-500 ease-out", toneBar[tone])}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
