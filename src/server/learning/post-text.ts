/**
 * Holds a drafted post to what can be posted as is: no em dashes (the house style), no stray
 * whitespace, and an X post inside X's 280 characters, cut at a sentence or word when the model
 * runs long.
 */

export const X_LIMIT = 280;

export function tidyPost(post: { linkedin: string; x: string }): { linkedin: string; x: string } {
  const clean = (text: string) =>
    text
      .replace(/\s*—\s*/g, ", ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  return { linkedin: clean(post.linkedin), x: fitX(clean(post.x)) };
}

function fitX(text: string): string {
  if ([...text].length <= X_LIMIT) return text;
  const head = [...text].slice(0, X_LIMIT).join("");
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  if (sentence > X_LIMIT / 2) return head.slice(0, sentence + 1);
  return `${head.slice(0, head.lastIndexOf(" ", X_LIMIT - 2)).trimEnd()}…`;
}
