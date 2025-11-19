/**
 * Configuration loading and validation for ni-plugin
 */

import { existsSync } from "fs";
import { join } from "path";
import type { Config, PackageManager } from "./types";

/**
 * Default configuration
 */
export function getDefaultConfig(): Config {
  return {
    enabled: true,
    dryRun: false,
    debug: false,
    disabledPackageManagers: [],
  };
}

/**
 * Validate and sanitize configuration
 */
export function validateConfig(config: unknown): Config {
  if (!config || typeof config !== "object") {
    return getDefaultConfig();
  }

  const c = config as Record<string, unknown>;
  const defaults = getDefaultConfig();

  const validated: Config = {
    enabled:
      typeof c.enabled === "boolean" ? c.enabled : defaults.enabled,
    dryRun:
      typeof c.dryRun === "boolean" ? c.dryRun : defaults.dryRun,
    debug: typeof c.debug === "boolean" ? c.debug : defaults.debug,
    disabledPackageManagers: Array.isArray(c.disabledPackageManagers)
      ? c.disabledPackageManagers.filter(
          (pm): pm is PackageManager =>
            typeof pm === "string" &&
            ["npm", "yarn", "pnpm", "bun", "npx", "bunx"].includes(pm)
        )
      : defaults.disabledPackageManagers,
  };

  return validated;
}

/**
 * Load configuration from file
 */
export async function loadConfigFile(path: string): Promise<Config | null> {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const file = Bun.file(path);
    const content = await file.json();
    return validateConfig(content);
  } catch (error) {
    // Invalid JSON or read error - return null
    return null;
  }
}

/**
 * Load configuration from standard locations
 * Priority: project > global > defaults
 */
export async function loadConfig(cwd: string): Promise<Config> {
  const configPaths = [
    join(cwd, ".ni-plugin.json"),
    join(process.env.HOME || "~", ".config", "ni-plugin", "config.json"),
  ];

  for (const path of configPaths) {
    const config = await loadConfigFile(path);
    if (config !== null) {
      return config;
    }
  }

  return getDefaultConfig();
}
