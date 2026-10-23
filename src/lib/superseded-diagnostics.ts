/**
 * A learner has one diagnostic. If a second was ever written (a retry that overlapped the first
 * write), the one they finished is their diagnostic, and any they never finished is left out
 * everywhere, so nothing asks them to take it again.
 */
export function withoutSupersededDiagnostics<T extends { kind: string; completedAt: Date | null }>(
  rows: T[],
): T[] {
  const finished = rows.some((row) => row.kind === "diagnostic" && row.completedAt !== null);
  return finished ? rows.filter((row) => row.kind !== "diagnostic" || row.completedAt !== null) : rows;
}
