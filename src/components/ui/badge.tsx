import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** State chips: process states, verdicts and levels. Shape or icon carries meaning, not colour alone. */
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-sm border px-2 text-caption font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "border-rule bg-raised text-foreground",
        signal: "border-transparent bg-signal text-signal-foreground",
        pass: "border-pass/30 bg-pass/10 text-pass",
        partial: "border-partial/30 bg-partial/10 text-partial",
        fail: "border-fail/30 bg-fail/10 text-fail",
        outline: "border-rule-strong bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
