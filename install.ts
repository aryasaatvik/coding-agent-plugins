#!/usr/bin/env bun

/**
 * Coding Agent Plugins Installer
 *
 * This is a convenience wrapper that runs the CLI package.
 *
 * For published usage, use:
 *   bunx coding-agent-plugins
 */

import { $ } from "bun";

// Run the CLI package with all arguments
const result = await $`bun packages/cli/bin/cli.js ${Bun.argv.slice(2)}`;
process.exit(result.exitCode);
