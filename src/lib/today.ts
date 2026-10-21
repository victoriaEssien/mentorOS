/**
 * The one thing Today asks of the learner next (PRD §26: "What's next?"). Unfinished business
 * outranks new work: the diagnostic everything depends on, then a surprise check (short, and only
 * honest if taken when it appears), then today's mission, then a check they started. Only when
 * nothing is open does Today offer new work.
 */
export type NextAction<Mission, Assessment> =
  | { kind: "diagnostic"; assessment: Assessment }
  | { kind: "path-on-its-way" }
  | { kind: "plan-path" }
  | { kind: "surprise"; assessment: Assessment }
  | { kind: "mission"; mission: Mission }
  | { kind: "check"; assessment: Assessment }
  | { kind: "get-mission" };

export function nextAction<Mission, Assessment>(state: {
  openDiagnostic: Assessment | null;
  hasPath: boolean;
  pathOnItsWay: boolean;
  openSurprise: Assessment | null;
  daily: Mission | null;
  openChecks: Assessment[];
}): NextAction<Mission, Assessment> {
  if (state.openDiagnostic) return { kind: "diagnostic", assessment: state.openDiagnostic };
  if (!state.hasPath) return state.pathOnItsWay ? { kind: "path-on-its-way" } : { kind: "plan-path" };
  if (state.openSurprise) return { kind: "surprise", assessment: state.openSurprise };
  if (state.daily) return { kind: "mission", mission: state.daily };
  if (state.openChecks[0]) return { kind: "check", assessment: state.openChecks[0] };
  return { kind: "get-mission" };
}
