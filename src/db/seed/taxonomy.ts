/**
 * Starter taxonomy: the six MVP tracks (PRD §4) and the example Software Engineering skill tree (PRD §11).
 * Other tracks' skill trees are still to be written.
 */

export type SeedTrack = { slug: string; name: string; description: string };
export type SeedSkill = { slug: string; name: string; track: string; parent?: string };

export const tracks: SeedTrack[] = [
  {
    slug: "software-engineering",
    name: "Software Engineering",
    description: "Programming, web, databases and systems.",
  },
  { slug: "cybersecurity", name: "Cybersecurity", description: "Attacks, defences and secure design." },
  {
    slug: "data-analysis",
    name: "Data Analysis & Analytics",
    description: "SQL, analysis and communicating insight.",
  },
  {
    slug: "electronics",
    name: "Electronics & Physical Engineering",
    description: "Circuits, microcontrollers, sensors and physical builds.",
  },
  {
    slug: "ui-ux-product",
    name: "UI/UX & Product",
    description: "Interface design, usability and product thinking.",
  },
  {
    slug: "cs-foundations",
    name: "Computer Science Foundations",
    description: "Algorithms, data structures, networking and operating systems.",
  },
];

const se = "software-engineering";

export const skills: SeedSkill[] = [
  { slug: "programming", name: "Programming", track: se },
  { slug: "variables-control-flow", name: "Variables & Control Flow", track: se, parent: "programming" },
  { slug: "functions", name: "Functions", track: se, parent: "programming" },
  { slug: "data-structures", name: "Data Structures", track: se, parent: "programming" },
  { slug: "algorithms", name: "Algorithms", track: se, parent: "programming" },
  { slug: "error-handling", name: "Error Handling", track: se, parent: "programming" },

  { slug: "web-development", name: "Web Development", track: se },
  { slug: "http", name: "HTTP", track: se, parent: "web-development" },
  { slug: "apis", name: "APIs", track: se, parent: "web-development" },
  { slug: "authentication", name: "Authentication", track: se, parent: "web-development" },
  { slug: "web-security", name: "Web Security", track: se, parent: "web-development" },

  { slug: "databases", name: "Databases", track: se },
  { slug: "sql", name: "SQL", track: se, parent: "databases" },
  { slug: "data-modeling", name: "Data Modeling", track: se, parent: "databases" },
  { slug: "indexing", name: "Indexing", track: se, parent: "databases" },
  { slug: "transactions", name: "Transactions", track: se, parent: "databases" },

  { slug: "systems", name: "Systems", track: se },
  { slug: "scalability", name: "Scalability", track: se, parent: "systems" },
  { slug: "distributed-systems", name: "Distributed Systems", track: se, parent: "systems" },
  { slug: "caching", name: "Caching", track: se, parent: "systems" },
  { slug: "architecture", name: "Architecture", track: se, parent: "systems" },
];

/** [skill, requires] pairs. Seed a few so the readiness gate has something to check. */
export const prerequisites: [string, string][] = [
  ["apis", "http"],
  ["authentication", "http"],
  ["transactions", "sql"],
  ["caching", "http"],
  ["distributed-systems", "scalability"],
];
