/** How an evaluation's outcome reads on a badge, wherever finished work is listed. */
export const OUTCOME_BADGE = {
  strong: { label: "Strong", variant: "pass" },
  pass: { label: "Pass", variant: "pass" },
  partial: { label: "Partial", variant: "partial" },
  fail: { label: "Didn't pass", variant: "fail" },
} as const;
