"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Height-animated disclosure body (grid-rows 0fr -> 1fr). Content stays mounted so form fields inside
 * a collapsed section are still submitted; while closed it is inert and invisible to keyboard / AT.
 */
export function Collapse({ open, children, className, id }: { open: boolean; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn("grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]", className)}>
      <div
        inert={!open}
        className={cn("min-h-0 overflow-hidden transition-[visibility] motion-reduce:transition-none", !open && "invisible")}
        style={{ transitionDuration: "0s", transitionDelay: open ? "0s" : "0.3s" }}
      >
        {children}
      </div>
    </div>
  );
}
