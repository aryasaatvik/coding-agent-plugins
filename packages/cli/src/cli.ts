/**
 * Coding Agent Plugins CLI
 *
 * Main CLI routing and command handling
 */

import { commands } from "./commands/index.js";
import { version } from "../package.json" with { type: "json" };

/**
 * Show help message
 */
function showHelp() {
  console.log(`
coding-agent-plugins v${version}

CLI for managing Claude Code and OpenCode plugins

USAGE:
  coding-agent-plugins [command] [options]

COMMANDS:
  install          Install plugins (default command)

GLOBAL OPTIONS:
  --help, -h       Show help
  --version, -v    Show version

INSTALL OPTIONS:
  --all                Install all available plugins
  --plugins=<names>    Install specific plugins (comma-separated)
  --claude-only        Install for Claude Code only
  --opencode-only      Install for OpenCode only
  --yes, -y            Skip confirmation prompts
  --dry-run            Preview changes without installing

EXAMPLES:
  # Interactive installation (default)
  coding-agent-plugins
  coding-agent-plugins install

  # Install all plugins
  coding-agent-plugins install --all

  # Install specific plugins
  coding-agent-plugins install --plugins=ni

  # Install for Claude Code only
  coding-agent-plugins install --claude-only --yes

  # Preview installation
  coding-agent-plugins install --dry-run

For more information, visit:
https://github.com/aryasaatvik/coding-agent-plugins
`);
}

/**
 * Show version
 */
function showVersion() {
  console.log(`coding-agent-plugins v${version}`);
}

/**
 * Run the CLI
 */
export async function run(args: string[]): Promise<void> {
  // Handle global flags first
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    showVersion();
    return;
  }

  // Extract command (default to 'install' if not provided or if first arg is a flag)
  const firstArg = args[0];
  const isFlag = firstArg?.startsWith("--") || firstArg?.startsWith("-");
  const command = !firstArg || isFlag ? "install" : firstArg;
  const commandArgs = !firstArg || isFlag ? args : args.slice(1);

  // Route to command
  if (command in commands) {
    await (commands[command as keyof typeof commands] as (args: string[]) => Promise<void>)(commandArgs);
  } else {
    console.error(`❌ Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
  }
}
