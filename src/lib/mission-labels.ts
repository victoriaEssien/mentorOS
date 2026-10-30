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
  expired: "Missed",
} as const;

/** "5 h left", "40 min left", "3 days left"; null once it's due. */
export function timeLeftLabel(dueAt: Date | null, now: Date = new Date()): string | null {
  if (!dueAt) return null;
  const minutes = Math.floor((dueAt.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h left`;
  return `${Math.floor(hours / 24)} days left`;
}

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
