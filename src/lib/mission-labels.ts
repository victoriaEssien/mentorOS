/** How missions are described in the UI. */

const TYPE_LABEL: Record<string, string> = {
  learn: "Learn",
  practice: "Practice",
  build: "Build",
  debug: "Debug",
  explain: "Explain",
  analyze: "Analyze",
  design: "Design",
  research: "Research",
  teach: "Teach",
  challenge: "Challenge",
};

export const missionTypeLabel = (type: string) => TYPE_LABEL[type] ?? "Mission";

export const MISSION_STATUS_LABEL = {
  assigned: "Not started",
  in_progress: "In progress",
  submitted: "Being evaluated",
  evaluated: "Evaluated",
  skipped: "Skipped",
} as const;

/** "About 45 minutes", "About 4 hours". */
export function durationLabel(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 90) return `About ${Math.round(minutes / 5) * 5} minutes`;
  const hours = Math.round(minutes / 30) / 2;
  return `About ${hours} hours`;
}

/** Numbered instruction lines ("1. Do this") as separate steps, numbers removed. */
export function instructionSteps(instructions: string): string[] {
  return instructions
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, "").trim())
    .filter(Boolean);
}
