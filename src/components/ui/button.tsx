import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        // The default action is the current selection: signal yellow under graphite ink.
        default: "bg-signal text-signal-foreground hover:bg-signal-strong",
        secondary: "border border-rule-strong bg-window text-foreground hover:bg-raised",
        outline: "border border-rule-strong bg-transparent text-foreground hover:bg-window",
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-fail text-white hover:bg-fail/90 dark:text-signal-foreground",
        link: "font-medium text-foreground underline decoration-rule-strong underline-offset-4 hover:decoration-foreground",
      },
      size: {
        default: "h-11 px-5 text-callout",
        sm: "h-9 rounded-sm px-3.5 text-footnote",
        lg: "h-12 px-6 text-headline",
        icon: "size-11",
        "icon-sm": "size-9 rounded-sm",
        "icon-lg": "size-12",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
