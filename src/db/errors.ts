/**
 * Whether a write failed on a unique constraint (Postgres 23505). Several tables use partial
 * unique indexes as guards ("one open attempt", "one active path"), so a racing duplicate write
 * fails and the caller reads what won instead.
 */
export function isUniqueViolation(error: unknown): boolean {
  const code = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? (value as { code: unknown }).code
      : undefined;
  return code(error) === "23505" || (error instanceof Error && code(error.cause) === "23505");
}
