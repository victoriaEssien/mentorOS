/** What each kind of question is called in the UI: what the learner has to do, not the taxonomy. */
const ITEM_TYPE_LABEL: Record<string, string> = {
  knowledge: "Quick check",
  conceptual: "Explain",
  code: "Read the code",
  debugging: "Find the bug",
  scenario: "Scenario",
  problem_solving: "Problem",
  practical: "Practical",
  security: "Security",
  data: "Data",
  electronics: "Electronics",
};

export const itemTypeLabel = (type: string) => ITEM_TYPE_LABEL[type] ?? "Question";
