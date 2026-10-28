/**
 * The one thing Today asks of the learner next (PRD §26: "What's next?"). Unfinished business
 * outranks new work: the diagnostic everything depends on, then a surprise check (short, and only
 * honest if taken when it appears), then today's mission (or the news that it ran out of time),
 * then a check they started. Only when nothing is open does Today offer new work.
 */
export type NextAction<Mission, Assessment> =
  | { kind: "diagnostic"; assessment: Assessment }
  | { kind: "write-diagnostic" }
  | { kind: "path-on-its-way" }
  | { kind: "plan-path" }
  | { kind: "surprise"; assessment: Assessment }
  | { kind: "mission"; mission: Mission }
  | { kind: "mission-over"; mission: Mission }
  | { kind: "check"; assessment: Assessment }
  | { kind: "get-mission" };

export function nextAction<Mission, Assessment>(state: {
  openDiagnostic: Assessment | null;
  /** Whether any diagnostic exists, taken or not. None means onboarding couldn't write it. */
  hasDiagnostic: boolean;
  hasPath: boolean;
  pathOnItsWay: boolean;
  openSurprise: Assessment | null;
  daily: Mission | null;
  /** The latest daily mission, when it ran out of time before it was handed in. */
  dailyOver: Mission | null;
  openChecks: Assessment[];
}): NextAction<Mission, Assessment> {
  if (state.openDiagnostic) return { kind: "diagnostic", assessment: state.openDiagnostic };
  if (!state.hasDiagnostic) return { kind: "write-diagnostic" };
  if (!state.hasPath) return state.pathOnItsWay ? { kind: "path-on-its-way" } : { kind: "plan-path" };
  if (state.openSurprise) return { kind: "surprise", assessment: state.openSurprise };
  if (state.daily) return { kind: "mission", mission: state.daily };
  if (state.dailyOver) return { kind: "mission-over", mission: state.dailyOver };
  if (state.openChecks[0]) return { kind: "check", assessment: state.openChecks[0] };
  return { kind: "get-mission" };
}
