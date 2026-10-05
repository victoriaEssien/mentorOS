import type { Route } from "next";

/**
 * Where to send someone after signing in. Only same-origin absolute paths are honoured, so a
 * crafted `?next=` can never bounce a learner to another site.
 */
export function safeNext(value: unknown, fallback: Route = "/today"): Route {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value as Route;
}
