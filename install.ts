#!/usr/bin/env bun

/**
 * Coding Agent Plugins Installer
 *
 * Interactive installer for coding agent plugins (Claude Code & OpenCode)
 *
 * Usage:
 *   bun install.ts                    # Interactive mode
 *   bun install.ts --all              # Install all plugins
 *   bun install.ts --plugins=ni       # Install specific plugins
 *   bun install.ts --claude-only      # Install for Claude Code only
 *   bun install.ts --opencode-only    # Install for OpenCode only
 *   bun install.ts --yes              # Skip confirmation
 *   bun install.ts --dry-run          # Preview changes without installing
 */

import { run } from "./shared/installer/cli";

// Run the installer
run(process.argv.slice(2)).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
