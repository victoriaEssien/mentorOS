import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's built-in scales. Our type scale (`text-headline`,
 * `text-callout`, ...) has to be registered as font sizes, or merging a size with a colour
 * (`text-headline` + `text-signal-foreground`) silently drops the colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "title", "headline", "body", "callout", "footnote", "caption"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
