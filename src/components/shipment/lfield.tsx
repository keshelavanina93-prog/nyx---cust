"use client";

import * as React from "react";
import { Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type ControlProps = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean };

/**
 * Labelled form field whose <label> is programmatically tied to its control (for / id) and whose hint/error is wired
 * through aria-describedby. Pass a single control element (Input, Select, Textarea) as the child; for composite
 * children pass `htmlFor` yourself.
 */
export function LField({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const uid = React.useId();
  const note = error ?? hint;
  const noteId = note ? `${uid}-note` : undefined;
  let control = children;
  let id = htmlFor;
  // with an explicit `htmlFor` the caller wires the control itself (composite children); otherwise decorate the single control
  if (htmlFor === undefined && React.isValidElement<ControlProps>(children)) {
    id = children.props.id ?? `${uid}-control`;
    control = React.cloneElement(children, { id, "aria-describedby": noteId ?? children.props["aria-describedby"], "aria-invalid": error ? true : children.props["aria-invalid"] });
  }
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {error ? (
        <p id={noteId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
