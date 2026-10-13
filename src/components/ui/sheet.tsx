"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Side drawer built on the Radix dialog primitive. */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn("no-print fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

const sheetVariants = cva("no-print fixed z-50 flex flex-col gap-4 bg-popover p-5 text-popover-foreground shadow-lift focus-visible:outline-none", {
  variants: {
    side: {
      left: "inset-y-0 left-0 h-full w-[85%] max-w-sm border-r data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left",
      right: "inset-y-0 right-0 h-full w-[85%] max-w-sm border-l data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right",
      top: "inset-x-0 top-0 max-h-[85dvh] border-b data-[state=closed]:animate-slide-out-top data-[state=open]:animate-slide-in-top",
      bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-[state=closed]:animate-slide-out-bottom data-[state=open]:animate-slide-in-bottom",
    },
  },
  defaultVariants: { side: "right" },
});

function SheetContent({
  side = "right",
  className,
  children,
  hideClose = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & VariantProps<typeof sheetVariants> & { hideClose?: boolean }) {
  const t = useTranslations("shell");
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {hideClose ? null : (
          <SheetPrimitive.Close className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
            <X className="size-4" aria-hidden />
            <span className="sr-only">{t("close")}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-semibold leading-tight tracking-tight", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
