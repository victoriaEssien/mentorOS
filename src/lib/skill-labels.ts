import { abilityBand, type AbilityBand } from "@/server/learning/skill-estimate";

const BAND_LABEL: Record<AbilityBand, string> = {
  strong: "Strong",
  intermediate: "Intermediate",
  developing: "Developing",
  beginner: "Beginner",
};

/** "Intermediate": an ability estimate in words, the same on every screen and in every email. */
export const abilityLabel = (ability: number) => BAND_LABEL[abilityBand(ability)];
