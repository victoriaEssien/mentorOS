/**
 * Streaming routes answer errors as JSON ({ error }), which the AI SDK surfaces as the Error's
 * message. Shows the route's own words, or the fallback when the failure came from elsewhere.
 */
export function routeErrorMessage(error: Error, fallback: string): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {}
  return fallback;
}
