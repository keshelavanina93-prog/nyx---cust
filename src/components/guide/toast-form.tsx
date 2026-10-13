"use client";

import * as React from "react";
import { toast } from "@/components/ui/toaster";

function isRedirect(e: unknown) {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/**
 * <form> wrapper around a server action that reports the outcome with a toast.
 * Redirects (e.g. the action navigates to the next step) are passed through untouched.
 */
export function ToastForm({
  action,
  success,
  failure,
  onDone,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (formData: FormData) => Promise<void>;
  success: string;
  failure: string;
  /** called after the action resolved successfully (e.g. to close a dialog) */
  onDone?: () => void;
}) {
  return (
    <form
      {...props}
      action={async (formData) => {
        try {
          await action(formData);
        } catch (e) {
          if (!isRedirect(e)) toast.error(failure);
          throw e;
        }
        toast.success(success);
        onDone?.();
      }}
    >
      {children}
    </form>
  );
}
