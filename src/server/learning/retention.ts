import { NotImplementedError } from "@/lib/errors";

/**
 * Surprise assessment scheduling (PRD §18, behaviour 8).
 * Picks skills whose evidence is ageing or whose confidence is low, and decides when to test them
 * without announcing it in advance.
 */
export type RetentionCandidate = {
  skillSlug: string;
  lastEvidenceAt: Date;
  ability: number;
  confidence: number;
};

export async function pickRetentionChecks(userId: string, limit = 1): Promise<RetentionCandidate[]> {
  void userId;
  void limit;
  throw new NotImplementedError("pickRetentionChecks");
}
