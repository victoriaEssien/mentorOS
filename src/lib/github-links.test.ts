import { describe, expect, it } from "vitest";

import { parseGithubLink, pickRepoFiles } from "./github-links";

describe("parseGithubLink", () => {
  it("recognises gists with or without the owner", () => {
    expect(parseGithubLink("https://gist.github.com/ada/0a1b2c3d4e5f")).toEqual({
      kind: "gist",
      id: "0a1b2c3d4e5f",
    });
    expect(parseGithubLink("https://gist.github.com/0a1b2c3d4e5f")).toEqual({
      kind: "gist",
      id: "0a1b2c3d4e5f",
    });
  });

  it("recognises repositories, branches and paths", () => {
    expect(parseGithubLink("https://github.com/ada/stock-lab.git")).toEqual({
      kind: "repo",
      owner: "ada",
      repo: "stock-lab",
      ref: null,
      path: null,
    });
    expect(parseGithubLink("https://github.com/ada/stock-lab/tree/main/sql")).toEqual({
      kind: "repo",
      owner: "ada",
      repo: "stock-lab",
      ref: "main",
      path: "sql",
    });
    expect(parseGithubLink("https://github.com/ada/stock-lab/blob/dev/src/app.py")).toMatchObject({
      ref: "dev",
      path: "src/app.py",
    });
  });

  it("refuses everything else", () => {
    for (const link of [
      "http://github.com/ada/stock-lab",
      "https://github.com/ada",
      "https://evil.example/github.com/ada/repo",
      "https://gist.github.com/ada/not-an-id",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(parseGithubLink(link)).toBeNull();
    }
  });
});

describe("pickRepoFiles", () => {
  const tree = [
    { path: "README.md", type: "blob", size: 900 },
    { path: "docs/notes.md", type: "blob", size: 400 },
    { path: "src/deep/nested/helper.py", type: "blob", size: 300 },
    { path: "src/app.py", type: "blob", size: 2000 },
    { path: "schema.sql", type: "blob", size: 500 },
    { path: "package.json", type: "blob", size: 300 },
    { path: "package-lock.json", type: "blob", size: 20_000 },
    { path: "node_modules/x/index.js", type: "blob", size: 100 },
    { path: "dist/bundle.min.js", type: "blob", size: 100 },
    { path: "data/huge.sql", type: "blob", size: 900_000 },
    { path: "logo.png", type: "blob", size: 1000 },
    { path: "src", type: "tree" },
  ];

  it("reads the README first, then code shallow before deep, skipping noise", () => {
    expect(pickRepoFiles(tree, { max: 10 })).toEqual([
      "README.md",
      "schema.sql",
      "src/app.py",
      "src/deep/nested/helper.py",
      "docs/notes.md",
      "package.json",
    ]);
  });

  it("reads a README without an extension, but not a README image", () => {
    const entries = [
      { path: "README", type: "blob", size: 13 },
      { path: "readme.png", type: "blob", size: 13 },
    ];
    expect(pickRepoFiles(entries, { max: 5 })).toEqual(["README"]);
  });

  it("honours a path and a limit", () => {
    expect(pickRepoFiles(tree, { max: 10, under: "src/" })).toEqual([
      "src/app.py",
      "src/deep/nested/helper.py",
    ]);
    expect(pickRepoFiles(tree, { max: 2 })).toEqual(["README.md", "schema.sql"]);
  });
});
