import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label above, control, then either a hint or the error below. The control receives the ids it
 * needs through `describedBy`, so screen readers announce the error with the field.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-footnote font-medium text-fail">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for a control inside a Field. */
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
