/**
 * wt-plugin for OpenCode 2
 *
 * Nudges `git worktree add` toward `wt new`. OpenCode blocks a tool by throwing
 * in `tool.execute.before`, so we throw with the wt suggestion as the message.
 */

import { analyzeCommand } from "../shared/translator";
import { loadConfig } from "../shared/config";

type ToolExecuteBefore = {
  tool: string;
  input: unknown;
};

type PluginContext = {
  location: { directory: string };
  tool: {
    hook: (
      name: "execute.before",
      callback: (event: ToolExecuteBefore) => Promise<void> | void,
    ) => Promise<{ dispose: () => Promise<void> }>;
  };
};

function shellCommand(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }
  const command = (input as { command?: unknown }).command;
  return typeof command === "string" ? command : undefined;
}

export default {
  id: "wt-plugin",
  setup: async (ctx: PluginContext) => {
    const registration = await ctx.tool.hook("execute.before", async (event) => {
      if (event.tool !== "shell") {
        return;
      }

      const command = shellCommand(event.input);
      if (!command) {
        return;
      }

      // Analysis is guarded so a config/parse failure never wedges the agent.
      // The intentional block is thrown *after* this block, never swallowed.
      let result;
      let config;
      try {
        config = await loadConfig(ctx.location.directory);
        if (!config.enabled) {
          return;
        }
        result = analyzeCommand(command, config);
      } catch (error) {
        console.error("[wt-plugin] Error:", error);
        return;
      }

      if (!result) {
        return;
      }

      if (config.debug) {
        console.error(`[wt-plugin] ${command} -> ${result.suggestion}`);
      }

      if (config.dryRun) {
        console.log(`[wt-plugin] [DRY RUN] would suggest: ${result.suggestion}`);
        return;
      }

      throw new Error(`🌳 wt-plugin: ${result.reason}`);
    });

    return () => registration.dispose();
  },
};
