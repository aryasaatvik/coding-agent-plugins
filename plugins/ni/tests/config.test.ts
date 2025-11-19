import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  getDefaultConfig,
  validateConfig,
  loadConfigFile,
  loadConfig,
} from "../shared/config";

const TEST_DIR = join(import.meta.dir, "fixtures", "config-test");

beforeEach(() => {
  // Create test directory
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  // Clean up test directory
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

describe("getDefaultConfig", () => {
  test("returns default configuration", () => {
    const config = getDefaultConfig();

    expect(config).toEqual({
      enabled: true,
      dryRun: false,
      debug: false,
      disabledPackageManagers: [],
    });
  });
});

describe("validateConfig", () => {
  test("validates valid config", () => {
    const input = {
      enabled: true,
      dryRun: false,
      debug: true,
      disabledPackageManagers: ["npm"],
    };

    const result = validateConfig(input);

    expect(result).toEqual(input);
  });

  test("returns defaults for null", () => {
    expect(validateConfig(null)).toEqual(getDefaultConfig());
  });

  test("returns defaults for undefined", () => {
    expect(validateConfig(undefined)).toEqual(getDefaultConfig());
  });

  test("returns defaults for non-object", () => {
    expect(validateConfig("not an object")).toEqual(getDefaultConfig());
    expect(validateConfig(123)).toEqual(getDefaultConfig());
    expect(validateConfig(true)).toEqual(getDefaultConfig());
  });

  test("uses defaults for invalid types", () => {
    const input = {
      enabled: "yes", // should be boolean
      dryRun: 1, // should be boolean
      debug: "true", // should be boolean
      disabledPackageManagers: "npm", // should be array
    };

    const result = validateConfig(input);

    expect(result).toEqual(getDefaultConfig());
  });

  test("filters invalid package managers", () => {
    const input = {
      disabledPackageManagers: ["npm", "invalid", "yarn", 123, "pnpm"],
    };

    const result = validateConfig(input);

    expect(result.disabledPackageManagers).toEqual(["npm", "yarn", "pnpm"]);
  });

  test("ignores unknown fields", () => {
    const input = {
      enabled: true,
      unknownField: "value",
      anotherField: 123,
    };

    const result = validateConfig(input);

    expect(result).toEqual({
      enabled: true,
      dryRun: false,
      debug: false,
      disabledPackageManagers: [],
    });
    expect("unknownField" in result).toBe(false);
  });

  test("handles partial config", () => {
    const input = {
      enabled: false,
    };

    const result = validateConfig(input);

    expect(result).toEqual({
      enabled: false,
      dryRun: false,
      debug: false,
      disabledPackageManagers: [],
    });
  });

  test("handles empty object", () => {
    const result = validateConfig({});

    expect(result).toEqual(getDefaultConfig());
  });
});

describe("loadConfigFile", () => {
  test("loads valid JSON config", async () => {
    const configPath = join(TEST_DIR, "config.json");
    const configData = {
      enabled: false,
      debug: true,
      disabledPackageManagers: ["npm"],
    };

    writeFileSync(configPath, JSON.stringify(configData));

    const result = await loadConfigFile(configPath);

    expect(result).toEqual({
      enabled: false,
      dryRun: false,
      debug: true,
      disabledPackageManagers: ["npm"],
    });
  });

  test("returns null for non-existent file", async () => {
    const configPath = join(TEST_DIR, "nonexistent.json");

    const result = await loadConfigFile(configPath);

    expect(result).toBeNull();
  });

  test("returns null for invalid JSON", async () => {
    const configPath = join(TEST_DIR, "invalid.json");

    writeFileSync(configPath, "{ invalid json }");

    const result = await loadConfigFile(configPath);

    expect(result).toBeNull();
  });

  test("returns null for empty file", async () => {
    const configPath = join(TEST_DIR, "empty.json");

    writeFileSync(configPath, "");

    const result = await loadConfigFile(configPath);

    expect(result).toBeNull();
  });

  test("validates config from file", async () => {
    const configPath = join(TEST_DIR, "config.json");
    const configData = {
      enabled: "yes", // invalid type
      debug: true,
    };

    writeFileSync(configPath, JSON.stringify(configData));

    const result = await loadConfigFile(configPath);

    // Should use default for enabled since it's invalid
    expect(result?.enabled).toBe(true);
    expect(result?.debug).toBe(true);
  });
});

describe("loadConfig", () => {
  test("loads project config first", async () => {
    const projectConfig = join(TEST_DIR, ".ni-plugin.json");
    const globalConfig = join(
      process.env.HOME || "~",
      ".config",
      "ni-plugin",
      "config.json"
    );

    // Create project config
    writeFileSync(
      projectConfig,
      JSON.stringify({
        enabled: false,
        debug: true,
      })
    );

    // Create global config (should be ignored)
    mkdirSync(join(process.env.HOME || "~", ".config", "ni-plugin"), {
      recursive: true,
    });
    writeFileSync(
      globalConfig,
      JSON.stringify({
        enabled: true,
        debug: false,
      })
    );

    const result = await loadConfig(TEST_DIR);

    // Should use project config
    expect(result.enabled).toBe(false);
    expect(result.debug).toBe(true);

    // Clean up global config
    rmSync(globalConfig);
  });

  test("falls back to global config", async () => {
    const globalConfig = join(
      process.env.HOME || "~",
      ".config",
      "ni-plugin",
      "config.json"
    );

    // Create global config
    mkdirSync(join(process.env.HOME || "~", ".config", "ni-plugin"), {
      recursive: true,
    });
    writeFileSync(
      globalConfig,
      JSON.stringify({
        enabled: false,
        dryRun: true,
      })
    );

    const result = await loadConfig(TEST_DIR);

    // Should use global config
    expect(result.enabled).toBe(false);
    expect(result.dryRun).toBe(true);

    // Clean up
    rmSync(globalConfig);
  });

  test("uses defaults if no config found", async () => {
    const result = await loadConfig(TEST_DIR);

    expect(result).toEqual(getDefaultConfig());
  });

  test("handles invalid project config, falls back to global", async () => {
    const projectConfig = join(TEST_DIR, ".ni-plugin.json");
    const globalConfig = join(
      process.env.HOME || "~",
      ".config",
      "ni-plugin",
      "config.json"
    );

    // Create invalid project config
    writeFileSync(projectConfig, "{ invalid }");

    // Create valid global config
    mkdirSync(join(process.env.HOME || "~", ".config", "ni-plugin"), {
      recursive: true,
    });
    writeFileSync(
      globalConfig,
      JSON.stringify({
        debug: true,
      })
    );

    const result = await loadConfig(TEST_DIR);

    // Should fall back to global config
    expect(result.debug).toBe(true);

    // Clean up
    rmSync(globalConfig);
  });
});

describe("config scenarios", () => {
  test("dry run mode config", () => {
    const config = validateConfig({
      dryRun: true,
    });

    expect(config.dryRun).toBe(true);
    expect(config.enabled).toBe(true);
  });

  test("disable plugin config", () => {
    const config = validateConfig({
      enabled: false,
    });

    expect(config.enabled).toBe(false);
  });

  test("debug mode config", () => {
    const config = validateConfig({
      debug: true,
    });

    expect(config.debug).toBe(true);
  });

  test("disable npm only", () => {
    const config = validateConfig({
      disabledPackageManagers: ["npm"],
    });

    expect(config.disabledPackageManagers).toEqual(["npm"]);
  });

  test("disable multiple package managers", () => {
    const config = validateConfig({
      disabledPackageManagers: ["npm", "yarn", "pnpm"],
    });

    expect(config.disabledPackageManagers).toEqual(["npm", "yarn", "pnpm"]);
  });

  test("all features enabled", () => {
    const config = validateConfig({
      enabled: true,
      dryRun: true,
      debug: true,
      disabledPackageManagers: ["npm"],
    });

    expect(config).toEqual({
      enabled: true,
      dryRun: true,
      debug: true,
      disabledPackageManagers: ["npm"],
    });
  });
});
