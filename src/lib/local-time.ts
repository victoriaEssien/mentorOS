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

/** Their calendar date as "YYYY-MM-DD", in UTC when the time zone isn't known. */
export function localDay(now: Date, timeZone: string | null): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timeZone ?? "UTC",
  }).format(now);
}

/** Today on their calendar. */
export const today = (timeZone: string | null) => localDay(new Date(), timeZone);

/** The Monday a "YYYY-MM-DD" day's week starts on, as "YYYY-MM-DD". */
export function weekStartOf(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - sinceMonday * 86_400_000).toISOString().slice(0, 10);
}
