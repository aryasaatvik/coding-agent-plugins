/**
 * session-title plugin for OpenCode 2
 *
 * Replaces OpenCode's built-in session title with `repo: title` inside a
 * repository or `category: title` outside one, generated with the session's
 * model through the native `title` hook.
 */

import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import type { Plugin } from "@opencode/plugin";
import type { SessionTitle } from "@opencode/plugin/promise/session";
import {
  CATEGORY_INSTRUCTION,
  formatCategorized,
  formatTitle,
} from "../shared/title";

export default {
  id: "session-title",
  async setup(ctx) {
    const registration = await ctx.session.hook("title", async (event) => {
      const prefix = repositoryName(ctx.location.project.directory);
      const prompt = composePrompt(
        event.system,
        event.messages,
        prefix === undefined,
      );
      if (!prompt) return;

      try {
        const generated = await ctx.generate.text({
          model: event.model,
          prompt,
        });
        const title =
          prefix === undefined
            ? formatCategorized(generated.text)
            : formatTitle(prefix, generated.text);
        if (title) event.result = title;
      } catch (error) {
        console.error("[session-title] generate failed", error);
      }
    });

    return () => registration.dispose();
  },
} satisfies Plugin.Plugin;

function repositoryName(directory: string) {
  if (existsSync(join(directory, ".git")) || existsSync(join(directory, ".hg")))
    return basename(directory);
}

function composePrompt(
  system: SessionTitle["system"],
  messages: SessionTitle["messages"],
  categorize: boolean,
) {
  const instructions = system.map((part) => part.text?.trim()).filter(Boolean);
  if (categorize) instructions.push(CATEGORY_INSTRUCTION);
  const conversation = messages.flatMap((message) =>
    (message.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text?.trim())
      .filter(Boolean),
  );
  return [...instructions, ...conversation].join("\n\n");
}
