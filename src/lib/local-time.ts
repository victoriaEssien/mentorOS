/**
 * The learner's own clock. Requests don't carry a time zone, so the app stores the device's in a
 * cookie on first visit (see TimeZoneSync). Until it has one, nothing here guesses: greetings
 * leave the time of day out and dates fall back to the server's calendar.
 */

export const TIME_ZONE_COOKIE = "mentoros-tz";

/** A time zone this runtime can format with, or null. */
export function knownTimeZone(value: string | null | undefined): string | null {
  if (!value) return null;
  const zone = value.includes("%") ? decodeURIComponent(value) : value;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return zone;
  } catch {
    return null;
  }
}

/** "Good morning, Victoria" and "Wednesday 21 October" in their time, or "Hi, Victoria" without it. */
export function greetingFor(
  name: string | null,
  timeZone: string | null,
  now: Date = new Date(),
): { title: string; date: string | null } {
  const first = name?.trim().split(/\s+/)[0];
  const who = first ? `, ${first}` : "";
  if (!timeZone) return { title: `Hi${who}`, date: null };

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  const part = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening";
  return {
    title: `Good ${part}${who}`,
    date: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone,
    }).format(now),
  };
}

/** "5 Oct", on their calendar when the time zone is known. */
export function shortDate(date: Date, timeZone: string | null): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}
