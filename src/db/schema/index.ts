/**
 * Data model (PRD §32). First draft: adjust freely before the first migration.
 *
 * Principle 7: the AI is not the database. skill_evidence is the source of truth;
 * user_skill is a derived snapshot; evaluations keep the raw structured AI output.
 */
export * from "./_shared";
export * from "./auth";
export * from "./skills";
export * from "./learner";
export * from "./assessments";
export * from "./learning";
export * from "./evaluations";
export * from "./mentor";
