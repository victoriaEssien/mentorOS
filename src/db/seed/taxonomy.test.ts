import { describe, expect, it } from "vitest";

import { prerequisites, skills, tracks } from "./taxonomy";

const bySlug = new Map(skills.map((skill) => [skill.slug, skill]));
const trackSlugs = new Set(tracks.map((track) => track.slug));
const isGroup = (slug: string) => {
  const skill = bySlug.get(slug);
  return Boolean(skill && !skill.parent);
};

describe("taxonomy", () => {
  it("has unique skill and track slugs", () => {
    expect(new Set(skills.map((skill) => skill.slug)).size).toBe(skills.length);
    expect(trackSlugs.size).toBe(tracks.length);
  });

  it("puts every skill in a known track, under a group from that track", () => {
    for (const skill of skills) {
      expect(trackSlugs.has(skill.track), `${skill.slug} track`).toBe(true);
      if (!skill.parent) continue;
      expect(isGroup(skill.parent), `${skill.slug} parent ${skill.parent}`).toBe(true);
      expect(bySlug.get(skill.parent)?.track, `${skill.slug} parent track`).toBe(skill.track);
    }
  });

  it("describes every leaf skill, since the AI modules read the descriptions", () => {
    for (const skill of skills.filter((s) => s.parent)) {
      expect(skill.description?.length ?? 0, skill.slug).toBeGreaterThan(20);
    }
  });

  it("places shared skills under groups that belong to the other track", () => {
    for (const skill of skills) {
      for (const placement of skill.alsoIn ?? []) {
        expect(placement.track, `${skill.slug} is already home there`).not.toBe(skill.track);
        expect(isGroup(placement.parent), `${skill.slug} → ${placement.parent}`).toBe(true);
        expect(bySlug.get(placement.parent)?.track, `${skill.slug} → ${placement.parent}`).toBe(
          placement.track,
        );
      }
    }
  });

  it("gives every track at least a few groups and assessable skills", () => {
    for (const track of tracks) {
      const groups = skills.filter((s) => s.track === track.slug && !s.parent);
      const leaves = skills.filter(
        (s) =>
          (s.track === track.slug && s.parent) ||
          s.alsoIn?.some((placement) => placement.track === track.slug),
      );
      expect(groups.length, track.slug).toBeGreaterThanOrEqual(3);
      expect(leaves.length, track.slug).toBeGreaterThanOrEqual(10);
    }
  });

  it("only links leaf skills as prerequisites", () => {
    for (const [skill, requires] of prerequisites) {
      expect(bySlug.get(skill)?.parent, skill).toBeTruthy();
      expect(bySlug.get(requires)?.parent, requires).toBeTruthy();
      expect(skill).not.toBe(requires);
    }
  });

  it("has no prerequisite cycles", () => {
    const requires = new Map<string, string[]>();
    for (const [skill, required] of prerequisites) {
      requires.set(skill, [...(requires.get(skill) ?? []), required]);
    }

    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (slug: string, trail: string[]): void => {
      if (done.has(slug)) return;
      if (visiting.has(slug)) throw new Error(`cycle: ${[...trail, slug].join(" → ")}`);
      visiting.add(slug);
      for (const next of requires.get(slug) ?? []) visit(next, [...trail, slug]);
      visiting.delete(slug);
      done.add(slug);
    };

    expect(() => {
      for (const slug of requires.keys()) visit(slug, []);
    }).not.toThrow();
  });
});
