/** How a concept verdict reads, and the badge it wears: plain words, never a score. */
export const VERDICT_BADGE = {
  solid: { label: "Solid", variant: "pass" },
  partly: { label: "Partly there", variant: "partial" },
  not_yet: { label: "Not yet", variant: "fail" },
} as const;

export type ConceptVerdict = keyof typeof VERDICT_BADGE;
