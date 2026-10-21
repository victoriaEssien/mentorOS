import { describe, expect, it } from "vitest";

import { greetingFor, knownTimeZone, shortDate } from "./local-time";

// 21 October 2026 was a Wednesday. Lagos is UTC+1 all year.
const at = (utc: string) => new Date(`2026-10-21T${utc}:00Z`);

describe("greetingFor", () => {
  it("greets by the learner's own time of day, with their date", () => {
    expect(greetingFor("Victoria Essien", "Africa/Lagos", at("07:30"))).toEqual({
      title: "Good morning, Victoria",
      date: "Wednesday 21 October",
    });
    expect(greetingFor("Victoria", "Africa/Lagos", at("13:00")).title).toBe("Good afternoon, Victoria");
    expect(greetingFor("Victoria", "Africa/Lagos", at("19:00")).title).toBe("Good evening, Victoria");
  });

  it("counts the small hours as evening, not morning", () => {
    expect(greetingFor("Victoria", "Africa/Lagos", at("01:00")).title).toBe("Good evening, Victoria");
  });

  it("uses their calendar day, not the server's", () => {
    // 23:30 UTC on the 21st is already the 22nd in Lagos.
    expect(greetingFor(null, "Africa/Lagos", at("23:30")).date).toBe("Thursday 22 October");
  });

  it("leaves the time of day out when it doesn't know their time zone", () => {
    expect(greetingFor("Victoria Essien", null, at("07:30"))).toEqual({ title: "Hi, Victoria", date: null });
    expect(greetingFor(" ", null).title).toBe("Hi");
  });
});

describe("knownTimeZone", () => {
  it("accepts real zones, including URL-encoded ones from a cookie", () => {
    expect(knownTimeZone("Africa/Lagos")).toBe("Africa/Lagos");
    expect(knownTimeZone("America%2FNew_York")).toBe("America/New_York");
  });

  it("rejects anything else", () => {
    expect(knownTimeZone("Mars/Olympus_Mons")).toBeNull();
    expect(knownTimeZone("")).toBeNull();
    expect(knownTimeZone(undefined)).toBeNull();
  });
});

describe("shortDate", () => {
  it("formats on their calendar when known", () => {
    expect(shortDate(at("23:30"), "Africa/Lagos")).toBe("22 Oct");
    expect(shortDate(at("23:30"), "UTC")).toBe("21 Oct");
  });
});
