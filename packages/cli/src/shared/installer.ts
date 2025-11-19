/**
 * Per-plugin installation logic
 */

import { join } from "path";
import { $ } from "bun";
import { existsSync } from "fs";
import type {
  PluginConfig,
  PlatformInfo,
  InstallOptions,
  InstallResult,
} from "./types";

export class PluginInstaller {
  constructor(
    private plugin: PluginConfig,
    private platforms: PlatformInfo,
    private options: InstallOptions
  ) {}

  async install(): Promise<InstallResult[]> {
    const results: InstallResult[] = [];

    // Install for Claude Code if detected and not excluded
    if (this.platforms.claudeCode.detected && !this.options.opencodeOnly) {
      results.push(await this.installClaude());
    }

    // Install for OpenCode if detected and not excluded
    if (this.platforms.openCode.detected && !this.options.claudeOnly) {
      results.push(await this.installOpenCode());
    }

    return results;
  }

  private async installClaude(): Promise<InstallResult> {
    try {
      if (this.options.dryRun) {
        return {
          plugin: this.plugin.name,
          platform: "claude",
          success: true,
        };
      }

      const claudeDir = this.platforms.claudeCode.path!;
      const cacheDir = join(claudeDir, "plugins", "cache", this.plugin.name);
      const marketplaceDir = join(
        claudeDir,
        "plugins",
        "marketplaces",
        "coding-agent-plugins"
      );

      // Clone/update marketplace repository
      if (existsSync(marketplaceDir) && existsSync(join(marketplaceDir, ".git"))) {
        // Update existing
        await $`cd ${marketplaceDir} && git pull origin main`.quiet();
      } else {
        // Fresh clone
        await $`rm -rf ${marketplaceDir}`.quiet();
        await $`mkdir -p ${join(claudeDir, "plugins", "marketplaces")}`.quiet();
        await $`git clone https://github.com/aryasaatvik/coding-agent-plugins.git ${marketplaceDir}`.quiet();
      }

      // Clone/update cache repository
      if (existsSync(cacheDir) && existsSync(join(cacheDir, ".git"))) {
        // Update existing
        await $`cd ${cacheDir} && git pull origin main`.quiet();
      } else {
        // Fresh clone
        await $`rm -rf ${cacheDir}`.quiet();
        await $`mkdir -p ${join(claudeDir, "plugins", "cache")}`.quiet();
        await $`git clone https://github.com/aryasaatvik/coding-agent-plugins.git ${cacheDir}`.quiet();
      }

      // Update installed_plugins.json
      await this.updateInstalledPlugins(cacheDir);

      // Update known_marketplaces.json
      await this.updateKnownMarketplaces(marketplaceDir);

      return {
        plugin: this.plugin.name,
        platform: "claude",
        success: true,
      };
    } catch (error) {
      return {
        plugin: this.plugin.name,
        platform: "claude",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async installOpenCode(): Promise<InstallResult> {
    try {
      if (this.options.dryRun) {
        return {
          plugin: this.plugin.name,
          platform: "opencode",
          success: true,
        };
      }

      const opencodeDir = this.platforms.openCode.path!;
      const pluginDir = join(opencodeDir, "plugin");
      const pluginFile = join(pluginDir, `${this.plugin.name}-plugin.js`);

      // Ensure plugin directory exists
      await $`mkdir -p ${pluginDir}`.quiet();

      // Copy the built plugin file
      const sourceFile = join("plugins", this.plugin.name, "opencode", `${this.plugin.name}-plugin.js`);
      if (!existsSync(sourceFile)) {
        throw new Error(`Plugin file not found: ${sourceFile}`);
      }

      await $`cp ${sourceFile} ${pluginFile}`.quiet();

      return {
        plugin: this.plugin.name,
        platform: "opencode",
        success: true,
      };
    } catch (error) {
      return {
        plugin: this.plugin.name,
        platform: "opencode",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async updateInstalledPlugins(cacheDir: string): Promise<void> {
    const claudeDir = this.platforms.claudeCode.path!;
    const installedJson = join(claudeDir, "plugins", "installed_plugins.json");
    const pluginJsonPath = join(cacheDir, "plugins", this.plugin.name, ".claude-plugin", "plugin.json");

    // Get plugin version
    const pluginJsonFile = Bun.file(pluginJsonPath);
    const pluginJson = await pluginJsonFile.json();
    const version = pluginJson.version;

    // Get git commit SHA
    const commitSha = await $`cd ${cacheDir} && git rev-parse HEAD`.text();
    const sha = commitSha.trim();

    // Get timestamp
    const timestamp = new Date().toISOString();

    // Read or create installed_plugins.json
    let installed: any = { version: 1, plugins: {} };
    if (existsSync(installedJson)) {
      const file = Bun.file(installedJson);
      installed = await file.json();
    }

    // Determine installedAt timestamp
    const pluginKey = `${this.plugin.name}@coding-agent-plugins`;
    const installedAt = installed.plugins[pluginKey]?.installedAt || timestamp;

    // Update entry
    installed.plugins[pluginKey] = {
      version,
      installedAt,
      lastUpdated: timestamp,
      installPath: cacheDir,
      gitCommitSha: sha,
      isLocal: false,
    };

    // Write back
    await Bun.write(installedJson, JSON.stringify(installed, null, 2));
  }

  private async updateKnownMarketplaces(marketplaceDir: string): Promise<void> {
    const claudeDir = this.platforms.claudeCode.path!;
    const marketplacesJson = join(claudeDir, "plugins", "known_marketplaces.json");
    const timestamp = new Date().toISOString();

    // Read or create known_marketplaces.json
    let marketplaces: any = {};
    if (existsSync(marketplacesJson)) {
      const file = Bun.file(marketplacesJson);
      marketplaces = await file.json();
    }

    // Add marketplace entry
    marketplaces["coding-agent-plugins"] = {
      source: {
        source: "github",
        repo: "aryasaatvik/coding-agent-plugins",
      },
      installLocation: marketplaceDir,
      lastUpdated: timestamp,
    };

    // Write back
    await Bun.write(marketplacesJson, JSON.stringify(marketplaces, null, 2));
  }

  async rollback(): Promise<void> {
    // TODO: Implement rollback logic if needed
  }
}
