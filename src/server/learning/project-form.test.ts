import { describe, expect, it } from "vitest";

import { THEMES, type ProjectForm } from "@/lib/themes";

import { planForm } from "./project-form";

describe("planForm", () => {
  it("takes the best fit when they haven't built it lately", () => {
    expect(planForm({ forms: ["web app", "mobile app"], recent: ["CLI tool", "library"] })).toBe("web app");
  });

  it("skips a form from their last two projects", () => {
    expect(planForm({ forms: ["web app", "mobile app"], recent: ["library", "web app"] })).toBe("mobile app");
  });

  it("lets a form come back once two other projects have passed", () => {
    expect(planForm({ forms: ["web app", "mobile app"], recent: ["CLI tool", "library", "web app"] })).toBe(
      "web app",
    );
  });

  it("falls back to the best fit when every form was built lately", () => {
    expect(planForm({ forms: ["web app"], recent: ["web app", "web app"] })).toBe("web app");
  });

  it("varies the forms across one pass of the curriculum", () => {
    const built: ProjectForm[] = [];
    for (const theme of THEMES) built.unshift(planForm({ forms: theme.forms, recent: built }));
    const kinds = new Set(built);
    for (const form of ["web app", "backend service", "CLI tool", "library", "browser extension", "mobile app"]) {
      expect(kinds).toContain(form);
    }
  });
});
