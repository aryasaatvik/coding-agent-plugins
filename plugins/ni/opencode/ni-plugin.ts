/**
 * ni-plugin for OpenCode
 * Automatically translates package manager commands to use ni
 */

import type { Plugin } from "@opencode-ai/plugin";
import { translateCommand } from "../shared/translator";
import { loadConfig } from "../shared/config";

export const NiPlugin: Plugin = async ({ directory }) => {
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

      try {
        // Load configuration
        const config = await loadConfig(directory);

        // Check if plugin is enabled
        if (!config.enabled) {
          return;
        }

        // Debug logging
        if (config.debug) {
          console.error(`[ni-plugin] Processing command: ${command}`);
          console.error(`[ni-plugin] Config:`, JSON.stringify(config));
        }

        // Translate the command
        const translated = translateCommand(command, config);

        if (translated) {
          // Dry run mode - log what would happen
          if (config.dryRun) {
            console.log(`[ni-plugin] [DRY RUN] Would translate: '${command}' → '${translated}'`);
            return;
          }

          // Update the command
          output.args.command = translated;
        }
      } catch (error) {
        // Silent failure - don't block user
        console.error("[ni-plugin] Error:", error);
      }
    },
  };
};
