#!/usr/bin/env bun

/**
 * Coding Agent Plugins CLI
 *
 * Main entry point for the coding-agent-plugins CLI.
 * Routes commands to appropriate handlers.
 */

import { run } from "../src/cli.js";

// Run the CLI with command-line arguments
run(process.argv.slice(2)).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
