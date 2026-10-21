"use client";

import { useEffect } from "react";

import { TIME_ZONE_COOKIE } from "@/lib/local-time";

/**
 * Tells the server the device's time zone, so greetings and dates read in local time from the
 * next request on. Writes the cookie only when it's missing or the zone has changed (travel).
 */
export function TimeZoneSync() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    const saved = document.cookie
      .split("; ")
      .find((pair) => pair.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.slice(TIME_ZONE_COOKIE.length + 1);
    if (saved && decodeURIComponent(saved) === zone) return;
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  return null;
}
