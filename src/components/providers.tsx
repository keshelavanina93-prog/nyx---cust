"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { CommandPalette } from "@/components/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

/** Client-side providers mounted once in the root layout (inside NextIntlClientProvider). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <CommandPalette>{children}</CommandPalette>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
