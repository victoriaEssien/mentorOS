"use client";

import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

import type { CodeLanguage } from "@/lib/code-languages";

const LANGUAGE: Record<CodeLanguage, () => ReturnType<typeof python>> = {
  python: () => python(),
  typescript: () => javascript({ typescript: true }),
  go: () => go(),
  rust: () => rust(),
  cpp: () => cpp(),
  java: () => java(),
};

// The app's own tokens, so the editor follows light and dark like everything else.
const theme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-raised)",
    color: "var(--color-foreground)",
    fontSize: "0.8125rem",
    border: "1px solid var(--color-rule)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },
  "&.cm-focused": { outline: "2px solid var(--color-ring)", outlineOffset: "2px" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.65" },
  ".cm-content": { padding: "12px 0", caretColor: "var(--color-foreground)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "color-mix(in oklab, var(--color-muted-foreground) 70%, transparent)",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 14px" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--color-foreground) 4%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-foreground)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--color-signal-soft)",
  },
  ".cm-cursor": { borderLeftColor: "var(--color-foreground)", borderLeftWidth: "2px" },
  ".cm-matchingBracket": { backgroundColor: "var(--color-signal-soft)", outline: "none" },
});

// Quiet on purpose: structure in weight, strings and comments in colour, everything else plain.
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.definitionKeyword], fontWeight: "600" },
  { tag: [tags.string, tags.special(tags.string), tags.character], color: "var(--color-pass)" },
  { tag: tags.comment, color: "var(--color-muted-foreground)", fontStyle: "italic" },
]);

/** A code editor for one answer: line numbers, brackets, indentation, and the language's highlighting. */
export function CodeEditor({
  value,
  onChange,
  language,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  label: string;
}) {
  const extensions = useMemo(
    () => [
      LANGUAGE[language](),
      theme,
      syntaxHighlighting(highlight),
      indentUnit.of(language === "go" ? "\t" : "    "),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", spellcheck: "false" }),
    ],
    [language, label],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="none"
      minHeight="16rem"
      basicSetup={{ foldGutter: false, autocompletion: false, highlightActiveLineGutter: true }}
    />
  );
}
