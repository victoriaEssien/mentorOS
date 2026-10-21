/**
 * The small Markdown subset model-written text uses here: paragraphs, bullet and numbered lists,
 * fenced code blocks, **bold** and `inline code`. Parsed into plain data and rendered by React,
 * so model output can never become HTML. Links keep only their text: a URL a model wrote may not
 * exist, so it never becomes something to tap.
 */

export type Inline = { kind: "text" | "bold" | "code"; text: string };

export type Block =
  | { kind: "paragraph"; lines: Inline[][] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "code"; language: string | null; code: string };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const FENCE = /^\s*```(\S*)\s*$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    const fence = line.match(FENCE);
    if (fence) {
      const code: string[] = [];
      index++;
      while (index < lines.length && !FENCE.test(lines[index])) code.push(lines[index++]);
      index++; // the closing fence, if there is one
      blocks.push({ kind: "code", language: fence[1] || null, code: code.join("\n") });
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line) && !BULLET.test(line);
      const pattern = ordered ? NUMBERED : BULLET;
      const items: Inline[][] = [];
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(parseInline(lines[index].match(pattern)![1]));
        index++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    if (line.trim() === "") {
      index++;
      continue;
    }

    const paragraph: Inline[][] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !FENCE.test(lines[index]) &&
      !BULLET.test(lines[index]) &&
      !NUMBERED.test(lines[index])
    ) {
      // Headings aren't part of the subset; keep their text as a plain line.
      paragraph.push(parseInline(lines[index].replace(/^\s*#{1,6}\s+/, "")));
      index++;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }

  return blocks;
}

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    const token = match[0];
    parts.push(
      token.startsWith("`")
        ? { kind: "code", text: token.slice(1, -1) }
        : token.startsWith("[")
          ? { kind: "text", text: token.slice(1, token.indexOf("](")) }
          : { kind: "bold", text: token.slice(2, -2) },
    );
    last = match.index + token.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
