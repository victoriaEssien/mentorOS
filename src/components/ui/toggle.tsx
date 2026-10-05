"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** A segment of a segmented control: the chosen segment lifts onto a window-coloured chip. */
const toggleVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 rounded-sm font-semibold whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-window data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(22_24_28/0.14)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-rule-strong bg-transparent",
      },
      size: {
        default: "h-9 min-w-9 px-3 text-footnote",
        sm: "h-8 min-w-8 px-2.5 text-caption",
        lg: "h-11 min-w-11 px-4 text-callout",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
