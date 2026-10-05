import * as React from "react";

import { cn } from "@/lib/utils";

const fieldClasses = [
  "w-full min-w-0 rounded-md border border-input bg-window text-body text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground",
  "focus-visible:border-foreground focus-visible:ring-4 focus-visible:ring-signal/45",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-fail aria-invalid:ring-fail/20",
];

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-11 px-3.5 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-footnote file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { fieldClasses, Input };
