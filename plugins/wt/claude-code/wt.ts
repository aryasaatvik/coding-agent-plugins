#!/usr/bin/env bun

/**
 * wt-plugin for Claude Code
 *
 * Nudges `git worktree add` toward `wt new` (which syncs gitignored files and
 * installs dependencies) by denying the raw command and suggesting the wt
 * equivalent. Other `git worktree` subcommands are left alone.
 */

import { loadConfig } from "../shared/config";
import { analyzeCommand } from "../shared/translator";

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

    const config = await loadConfig(cwd);

    if (config.enabled === false) {
      process.exit(0);
    }

    if (config.debug) {
      console.error(`[wt-plugin] Processing command: ${command}`);
      console.error(`[wt-plugin] Config:`, JSON.stringify(config));
    }

    const result = analyzeCommand(command, config);

    if (!result) {
      if (config.debug) {
        console.error(`[wt-plugin] No suggestion for: ${command}`);
      }
      process.exit(0);
    }

    // Dry run - advise without blocking.
    if (config.dryRun) {
      const output: HookOutput = {
        systemMessage: `🌳 [DRY RUN] wt-plugin would suggest: \`${result.suggestion}\``,
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(0);
    }

    // Block the raw command and hand the agent the wt equivalent.
    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: result.reason,
      },
      systemMessage: `🌳 wt-plugin: suggested \`${result.suggestion}\` instead of \`git worktree add\``,
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
