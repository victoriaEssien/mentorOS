/** The Postgres error code on a failed write, wherever the driver put it. */
function pgCode(error: unknown): unknown {
  const code = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? (value as { code: unknown }).code
      : undefined;
  return code(error) ?? (error instanceof Error ? code(error.cause) : undefined);
}

/**
 * Whether a write failed on a unique constraint (Postgres 23505). Several tables use partial
 * unique indexes as guards ("one open attempt", "one active path"), so a racing duplicate write
 * fails and the caller reads what won instead.
 */
export function isUniqueViolation(error: unknown): boolean {
  return pgCode(error) === "23505";
}

/** Whether a write pointed at a row that no longer exists (Postgres 23503), such as a deleted user. */
export function isForeignKeyViolation(error: unknown): boolean {
  return pgCode(error) === "23503";
}
