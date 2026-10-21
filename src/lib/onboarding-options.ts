/**
 * Choices offered during onboarding (PRD §8). Shared by the wizard and the server action so both
 * validate against the same lists. Background informs; it never sets a skill level.
 */

export const goalOptions = [
  "Become job-ready",
  "Become a better engineer",
  "Build personal projects",
  "Learn for school",
  "Change careers",
  "Explore a new field",
  "Build physical projects",
  "Understand computer science fundamentals",
] as const;

export const experienceOptions = [
  { value: 0, label: "New to this" },
  { value: 1, label: "Under 2 years" },
  { value: 3, label: "2 to 5 years" },
  { value: 6, label: "More than 5 years" },
] as const;

export const weeklyHourOptions = [
  { value: 2, label: "About 2 hours" },
  { value: 5, label: "About 5 hours" },
  { value: 10, label: "About 10 hours" },
  { value: 15, label: "15 hours or more" },
] as const;

export const learningStyleOptions = [
  "Build first, look things up when stuck",
  "Understand it first, then build",
  "Short exercises, often",
  "Talk it through with the mentor",
] as const;

export const toneOptions = [
  { value: "direct", label: "Straight talk", detail: "Blunt and brief. Tell me what's wrong." },
  { value: "balanced", label: "Direct and fair", detail: "Honest and specific, without being harsh." },
  { value: "supportive", label: "Encouraging", detail: "Start with what worked, then the problems." },
] as const;

export const technologySuggestions = [
  "JavaScript",
  "TypeScript",
  "Python",
  "SQL",
  "React",
  "Node.js",
  "Git",
  "Docker",
  "Linux",
  "Java",
  "C/C++",
  "Excel",
  "Figma",
  "Arduino",
] as const;
