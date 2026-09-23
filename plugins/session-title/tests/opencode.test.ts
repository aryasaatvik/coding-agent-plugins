import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin from "../opencode/session-title-plugin";

type TitleEvent = {
  model: string;
  system: Array<{ text?: string }>;
  messages: Array<{ content?: Array<{ type: string; text?: string }> }>;
  result?: string;
};

async function runTitleHook(directory: string, generated: string) {
  let handler: ((event: TitleEvent) => Promise<void>) | undefined;
  let prompt: string | undefined;
  const ctx = {
    location: { project: { directory } },
    session: {
      hook: async (name: string, callback: typeof handler) => {
        expect(name).toBe("title");
        handler = callback;
        return { dispose: async () => {} };
      },
    },
    generate: {
      text: async (request: { prompt: string }) => {
        prompt = request.prompt;
        return { text: generated };
      },
    },
  };
  const cleanup = await plugin.setup(ctx as never);
  const event: TitleEvent = {
    model: "test/model",
    system: [{ text: "Generate a title." }],
    messages: [
      { content: [{ type: "text", text: "quiet the ni plugin" }] },
      { content: [{ type: "tool", text: "ignored" }] },
    ],
  };
  await handler!(event);
  await cleanup();
  return { result: event.result, prompt };
}

describe("OpenCode session-title plugin", () => {
  test("prefixes the repository inside a repo", async () => {
    const directory = join(mkdtempSync(join(tmpdir(), "st-")), "dotfiles");
    mkdirSync(join(directory, ".git"), { recursive: true });
    const { result, prompt } = await runTitleHook(directory, "Quiet NI Plugin");
    expect(result).toBe("dotfiles: quiet ni plugin");
    expect(prompt).toContain("quiet the ni plugin");
    expect(prompt).not.toContain("category: title");
    expect(prompt).not.toContain("ignored");
  });

  test("asks for a category outside a repo", async () => {
    const directory = mkdtempSync(join(tmpdir(), "st-"));
    const { result, prompt } = await runTitleHook(
      directory,
      "Plugins: Quiet NI",
    );
    expect(result).toBe("plugins: quiet ni");
    expect(prompt).toContain("category: title");
  });
});
