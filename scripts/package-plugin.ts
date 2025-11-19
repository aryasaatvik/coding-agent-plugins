#!/usr/bin/env bun

/**
 * Package a single plugin for distribution
 *
 * Usage: bun scripts/package-plugin.ts <plugin-name>
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { $ } from "bun";

const pluginName = process.argv[2];

if (!pluginName) {
  console.error("Error: Plugin name required");
  console.error("Usage: bun scripts/package-plugin.ts <plugin-name>");
  process.exit(1);
}

const pluginDir = join("plugins", pluginName);
const buildDir = "build";
const outputFile = join(buildDir, `${pluginName}-plugin.tar.gz`);

// Verify plugin exists
if (!existsSync(pluginDir)) {
  console.error(`Error: Plugin '${pluginName}' not found at ${pluginDir}`);
  process.exit(1);
}

// Create build directory
if (!existsSync(buildDir)) {
  mkdirSync(buildDir, { recursive: true });
}

console.log(`📦 Packaging ${pluginName}...`);

try {
  // Build list of files to include
  const filesToInclude: string[] = [];

  // Always include if they exist
  const alwaysInclude = [
    "hooks",
    "opencode",
    ".claude-plugin",
    "shared",
    "package.json",
    "README.md",
    "LICENSE",
    "config.example.json",
  ];

  for (const file of alwaysInclude) {
    const filePath = join(pluginDir, file);
    if (existsSync(filePath)) {
      filesToInclude.push(file);
    }
  }

  if (filesToInclude.length === 0) {
    console.error(`Error: No files found to package for ${pluginName}`);
    process.exit(1);
  }

  // Create tarball, excluding TypeScript source files and tests
  await $`tar -czf ${outputFile} -C ${pluginDir} --exclude='*.ts' --exclude='tests' --exclude='node_modules' --exclude='bun.lockb' --exclude='tsconfig.json' ${filesToInclude}`;

  // Get file size
  const stat = await Bun.file(outputFile).stat();
  const sizeKB = (stat.size / 1024).toFixed(2);

  console.log(`✓ ${pluginName}-plugin.tar.gz created (${sizeKB} KB)`);
  console.log(`  Location: ${outputFile}`);
  console.log(`  Files: ${filesToInclude.join(", ")}`);
} catch (error) {
  console.error(`Error packaging ${pluginName}:`, error);
  process.exit(1);
}
