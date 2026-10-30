/**
 * What a project is built as: a web app, a CLI tool, a library, a browser extension and so on.
 * Each theme lists the forms that suit it, best fit first; a project takes the first one the
 * learner hasn't built lately, so the forms vary across the curriculum. Pure, so the Project
 * Writer is told the form rather than choosing it.
 */

import type { ProjectForm } from "@/lib/themes";

/** How many of their latest projects a form sits out before it comes round again. */
export const FORM_REST = 2;

export function planForm({
  forms,
  recent,
}: {
  /** The theme's forms, best fit first. */
  forms: readonly ProjectForm[];
  /** Forms of their latest projects, newest first; null for projects from before forms. */
  recent: readonly (ProjectForm | null)[];
}): ProjectForm {
  const lately = new Set(recent.slice(0, FORM_REST));
  return forms.find((form) => !lately.has(form)) ?? forms[0]!;
}
