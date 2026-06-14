/**
 * wt-plugin for OpenCode
 *
 * Nudges `git worktree add` toward `wt new`. OpenCode blocks a tool by throwing
 * in `tool.execute.before`, so we throw with the wt suggestion as the message.
 */

import type { Plugin } from "@opencode-ai/plugin";
import { analyzeCommand } from "../shared/translator";
import { loadConfig } from "../shared/config";

export const WtPlugin: Plugin = async ({ directory }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Only process bash/shell commands
      if (input.tool !== "bash" && input.tool !== "shell") {
        return;
      }

      const command = output.args?.command;
      if (!command || typeof command !== "string") {
        return;
      }

      // Analysis is guarded so a config/parse failure never wedges the agent.
      // The intentional block is thrown *after* this block, never swallowed.
      let result;
      let config;
      try {
        config = await loadConfig(directory);
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

      // Dry run - advise without blocking.
      if (config.dryRun) {
        console.log(`[wt-plugin] [DRY RUN] would suggest: ${result.suggestion}`);
        return;
      }

      // Throwing aborts the tool; OpenCode surfaces the message to the model.
      throw new Error(`🌳 wt-plugin: ${result.reason}`);
    },
  };
};
