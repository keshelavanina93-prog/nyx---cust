"use client";

import * as React from "react";
import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "next-themes";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Sonner wrapper bound to the design tokens and the active theme. Mounted once in the root layout. */
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      offset={16}
      mobileOffset={{ bottom: 84, left: 16, right: 16 }}
      className="no-print toaster group"
      toastOptions={{ classNames: { toast: "!rounded-xl !shadow-lift !font-sans" } }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--success)",
          "--success-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--danger)",
          "--error-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
