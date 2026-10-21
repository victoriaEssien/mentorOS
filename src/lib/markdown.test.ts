import { describe, expect, it } from "vitest";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("splits bold and inline code from text", () => {
    expect(parseInline("Use **one** `UPDATE` here")).toEqual([
      { kind: "text", text: "Use " },
      { kind: "bold", text: "one" },
      { kind: "text", text: " " },
      { kind: "code", text: "UPDATE" },
      { kind: "text", text: " here" },
    ]);
  });

  it("keeps a link's text and drops its URL", () => {
    expect(parseInline("Take it [here](https://made-up.example/x) now")).toEqual([
      { kind: "text", text: "Take it " },
      { kind: "text", text: "here" },
      { kind: "text", text: " now" },
    ]);
  });

  it("reads *italic* but leaves asterisks inside formulas alone", () => {
    expect(parseInline("A check like *and* on one range")).toEqual([
      { kind: "text", text: "A check like " },
      { kind: "italic", text: "and" },
      { kind: "text", text: " on one range" },
    ]);
    expect(parseInline("Use B2*$E$1 or units*price, and 2 * 3 * 4")).toEqual([
      { kind: "text", text: "Use B2*$E$1 or units*price, and 2 * 3 * 4" },
    ]);
    expect(parseInline("**bold** stays bold")[0]).toEqual({ kind: "bold", text: "bold" });
  });

  it("leaves HTML as text", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([
      { kind: "text", text: "<script>alert(1)</script>" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("reads paragraphs, lists and fenced code", () => {
    const blocks = parseMarkdown(
      [
        "## Why",
        "A waiting update",
        "still runs.",
        "",
        "- first",
        "* second",
        "",
        "1. one",
        "2) two",
        "```sql",
        "UPDATE t SET x = 1;",
        "```",
        "Done.",
      ].join("\n"),
    );

    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "list", "list", "code", "paragraph"]);
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      lines: [
        [{ kind: "text", text: "Why" }],
        [{ kind: "text", text: "A waiting update" }],
        [{ kind: "text", text: "still runs." }],
      ],
    });
    expect(blocks[1]).toMatchObject({ kind: "list", ordered: false });
    expect(blocks[2]).toMatchObject({ kind: "list", ordered: true });
    expect(blocks[3]).toEqual({ kind: "code", language: "sql", code: "UPDATE t SET x = 1;" });
  });

  it("survives an unclosed fence while streaming", () => {
    expect(parseMarkdown("```js\nconst a = 1;")).toEqual([
      { kind: "code", language: "js", code: "const a = 1;" },
    ]);
  });
});
