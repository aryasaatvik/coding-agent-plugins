#!/usr/bin/env bun

/**
 * ni-plugin for Claude Code
 * Automatically translates package manager commands to use ni
 */

import { loadConfig } from "../shared/config";
import { translateCommand } from "../shared/translator";

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: any;
  };
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason: string;
    updatedInput?: {
      command: string;
      [key: string]: any;
    };
  };
  systemMessage?: string;
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    const hookInput: HookInput = JSON.parse(input);

    const { tool_name, tool_input, cwd } = hookInput;
    const command = tool_input.command;

    if (tool_name !== "Bash" || !command) {
      process.exit(0);
    }

    // Load configuration
    const config = await loadConfig(cwd);

    // Check if plugin is enabled
    if (config.enabled === false) {
      process.exit(0);
    }

    // Debug logging
    if (config.debug) {
      console.error(`[ni-plugin] Processing command: ${command}`);
      console.error(`[ni-plugin] Config:`, JSON.stringify(config));
    }

    const translated = translateCommand(command, config);

    if (translated) {
      // Dry run mode - show what would happen
      if (config.dryRun) {
        const output: HookOutput = {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow",
            permissionDecisionReason: `[DRY RUN] Would translate: '${command}' → '${translated}'`,
            updatedInput: {
              command: translated,
            },
          },
          systemMessage: `📦 [DRY RUN] ni-plugin would translate: '${command}' → '${translated}'`,
        };
        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
      }

      // Actually translate the command
      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason: `Translated: '${command}' → '${translated}'`,
          updatedInput: {
            command: translated,
          },
        },
        systemMessage: `📦 ni-plugin: Translated '${command}' → '${translated}'`,
      };

      console.log(JSON.stringify(output, null, 2));
      process.exit(0);
    }

    // No translation needed - log if debug mode
    if (config.debug) {
      console.error(`[ni-plugin] No translation needed for: ${command}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
