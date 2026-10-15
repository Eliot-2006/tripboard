import type { ReactNode } from "react";
import { cn } from "cn";
import { Label } from "./label";

export type A11y = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

export type FieldProps = { id: string; label: string; error?: string; hint?: string; className?: string; children: (a11y: A11y) => ReactNode };

/** Label, control and its message, wired together so the message is announced with the field (UX-4). */
export function Field({ id, label, error, hint, className, children }: FieldProps) {
  // An error replaces the hint, so only describe the field by what is on screen.
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
