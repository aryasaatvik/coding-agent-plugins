#!/usr/bin/env bun

/**
 * Build script for coding-agent-plugins CLI
 *
 * Bundles the CLI code and copies necessary assets
 */

import { copyFileSync, mkdirSync } from "fs";

console.log("📦 Building CLI package...\n");

// Build the CLI
const result = await Bun.build({
  entrypoints: ["./bin/cli.js"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  sourcemap: "external",
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Ensure .claude-plugin directory exists in dist
mkdirSync("./dist/.claude-plugin", { recursive: true });

// Copy marketplace.json to dist
copyFileSync(
  "../../.claude-plugin/marketplace.json",
  "./dist/.claude-plugin/marketplace.json"
);

console.log("✓ Bundled CLI to dist/cli.js");
console.log("✓ Copied marketplace.json to dist/.claude-plugin/");
console.log(`\n✨ Build complete!`);

// Show bundle size
const bundleFile = Bun.file("./dist/cli.js");
const stat = await bundleFile.stat();
const sizeKB = (stat.size / 1024).toFixed(2);
console.log(`📊 Bundle size: ${sizeKB} KB`);
