/**
 * ni-plugin for OpenCode 2
 * Automatically translates package manager commands to use ni
 */

import { translateCommand } from "../shared/translator";
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
  id: "ni-plugin",
  setup: async (ctx: PluginContext) => {
    const registration = await ctx.tool.hook("execute.before", async (event) => {
      if (event.tool !== "shell") {
        return;
      }

      const command = shellCommand(event.input);
      if (!command) {
        return;
      }

      try {
        const config = await loadConfig(ctx.location.directory);
        if (!config.enabled) {
          return;
        }

        if (config.debug) {
          console.error(`[ni-plugin] Processing command: ${command}`);
          console.error(`[ni-plugin] Config:`, JSON.stringify(config));
        }

        const translated = translateCommand(command, config);
        if (!translated) {
          return;
        }

        if (config.dryRun) {
          console.log(`[ni-plugin] [DRY RUN] Would translate: '${command}' → '${translated}'`);
          return;
        }

        (event.input as { command: string }).command = translated;
      } catch (error) {
        console.error("[ni-plugin] Error:", error);
      }
    });

    return () => registration.dispose();
  },
};
