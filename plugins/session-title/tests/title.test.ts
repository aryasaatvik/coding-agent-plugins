import { describe, expect, test } from "bun:test";
import {
  composePrompt,
  extractTurns,
  formatCategorized,
  formatTitle,
  isTitleCommand,
  renderConversation,
  repositoryName,
} from "../shared/title";

const jsonl = [
  { type: "user", message: { content: "make ni quieter" } },
  {
    type: "assistant",
    message: { content: [{ type: "thinking", thinking: "hmm" }] },
  },
  {
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Bash" }] },
  },
  {
    type: "user",
    message: { content: [{ type: "tool_result", content: "ok" }] },
  },
  {
    type: "assistant",
    message: { content: [{ type: "text", text: "Removed the message." }] },
  },
  { type: "user", isMeta: true, message: { content: "meta reminder" } },
  { type: "user", isSidechain: true, message: { content: "subagent prompt" } },
  { type: "user", message: { content: "<command-name>/title</command-name>" } },
  { type: "ai-title", aiTitle: "ignored" },
]
  .map((entry) => JSON.stringify(entry))
  .concat(["not json", ""])
  .join("\n");

describe("extractTurns", () => {
  test("keeps user prompts and assistant text only", () => {
    expect(extractTurns(jsonl)).toEqual([
      { role: "user", text: "make ni quieter" },
      { role: "assistant", text: "Removed the message." },
    ]);
  });
});

describe("renderConversation", () => {
  test("keeps the first prompt and the most recent turns", () => {
    const turns = [
      { role: "user" as const, text: "first prompt" },
      ...Array.from({ length: 40 }, (_, index) => ({
        role: "assistant" as const,
        text: `reply ${index} ${"x".repeat(500)}`,
      })),
    ];
    const rendered = renderConversation(turns);
    expect(rendered.startsWith("User: first prompt")).toBe(true);
    expect(rendered).toContain("reply 39");
    expect(rendered).not.toContain("reply 0 ");
    expect(rendered.length).toBeLessThan(14_000);
  });

  test("truncates a single oversized recent turn", () => {
    const rendered = renderConversation([
      { role: "user", text: "first" },
      { role: "assistant", text: "y".repeat(50_000) },
    ]);
    expect(rendered.length).toBeLessThan(14_000);
  });
});

describe("composePrompt", () => {
  test("asks for category only outside a repository", () => {
    expect(composePrompt("User: hi", true)).toContain("category: title");
    expect(composePrompt("User: hi", false)).not.toContain("category: title");
  });
});

describe("formatting", () => {
  test("prefixes the repository and lowercases", () => {
    expect(formatTitle("dotfiles", '"Review Global Skills"\n')).toBe(
      "dotfiles: review global skills",
    );
  });

  test("does not double the repository prefix", () => {
    expect(formatTitle("dotfiles", "Dotfiles: review skills")).toBe(
      "dotfiles: review skills",
    );
    expect(formatTitle("dotfiles", "dotfiles")).toBeUndefined();
  });

  test("keeps the model's category outside a repository", () => {
    expect(formatCategorized("\nOpenCode: Session Titles\nextra")).toBe(
      "opencode: session titles",
    );
    expect(formatCategorized("  \n")).toBeUndefined();
  });
});

describe("repositoryName", () => {
  test("resolves primary checkouts and linked worktrees", () => {
    expect(repositoryName("/Users/me/Developer/dotfiles/.git\n")).toBe(
      "dotfiles",
    );
  });

  test("handles bare repositories", () => {
    expect(repositoryName("/srv/git/project.git")).toBe("project");
  });
});

describe("isTitleCommand", () => {
  test("matches /title and the namespaced form only", () => {
    expect(isTitleCommand(" /title ")).toBe(true);
    expect(isTitleCommand("/session-title:title")).toBe(true);
    expect(isTitleCommand("/title please")).toBe(false);
    expect(isTitleCommand("fix the /title command")).toBe(false);
  });
});
