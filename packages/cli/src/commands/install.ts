/**
 * Install command
 *
 * Installs coding agent plugins to Claude Code and/or OpenCode
 */

import { parseArgs } from "util";
import type {
  CLIOptions,
  MarketplaceConfig,
  InstallResult,
} from "../shared/types.js";
import { detectPlatforms, checkDependencies } from "../shared/detector.js";
import {
  showIntro,
  showOutro,
  showPluginSelector,
  showPlatformDetection,
  confirmInstall,
  showMissingDependencies,
  createSpinner,
  showResults,
  showDryRunMode,
} from "../shared/ui.js";
import { PluginInstaller } from "../shared/installer.js";
import { log } from "@clack/prompts";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Install command handler
 */
export async function install(args: string[]): Promise<void> {
  // Parse CLI arguments
  const options = parseCLIArgs(args);

  // Show intro
  showIntro();

  // Dry run mode
  if (options.dryRun) {
    showDryRunMode();
  }

  // Detect platforms
  const s = createSpinner("Detecting platforms...");
  s.start("Detecting platforms...");
  const platforms = await detectPlatforms();
  s.stop("Platforms detected");

  showPlatformDetection(platforms);

  // Check if any platform is detected
  if (!platforms.claudeCode.detected && !platforms.openCode.detected) {
    log.error(
      "No supported platforms detected. Install Claude Code or OpenCode first."
    );
    showOutro(false);
    process.exit(1);
  }

  // Check dependencies
  const deps = await checkDependencies(platforms);
  if (!deps.jq || !deps.bun) {
    showMissingDependencies(deps);
    showOutro(false);
    process.exit(1);
  }

  // Load marketplace.json
  const marketplace = await loadMarketplace();

  // Determine which plugins to install
  let selectedPlugins: string[];

  if (options.all) {
    // Install all plugins
    selectedPlugins = marketplace.plugins.map((p) => p.name);
  } else if (options.plugins && options.plugins.length > 0) {
    // Install specific plugins
    selectedPlugins = options.plugins;
  } else {
    // Interactive selection
    selectedPlugins = await showPluginSelector(marketplace.plugins);
  }

  // Filter to available plugins
  const pluginsToInstall = marketplace.plugins.filter((p) =>
    selectedPlugins.includes(p.name)
  );

  if (pluginsToInstall.length === 0) {
    log.warn("No plugins selected");
    showOutro(false);
    process.exit(0);
  }

  // Determine target platforms
  const targetPlatforms: string[] = [];
  if (platforms.claudeCode.detected && !options.opencodeOnly) {
    targetPlatforms.push("Claude Code");
  }
  if (platforms.openCode.detected && !options.claudeOnly) {
    targetPlatforms.push("OpenCode");
  }

  // Confirm installation (unless --yes flag)
  if (!options.yes && !options.dryRun) {
    const confirmed = await confirmInstall(
      pluginsToInstall.map((p) => p.name),
      targetPlatforms
    );

    if (!confirmed) {
      log.info("Installation cancelled");
      showOutro(false);
      process.exit(0);
    }
  }

  // Install plugins
  log.info("");
  log.info("Installing plugins...");
  const allResults: InstallResult[] = [];

  for (const plugin of pluginsToInstall) {
    const spinner = createSpinner(`Installing ${plugin.name}...`);
    spinner.start(`Installing ${plugin.name}...`);

    const installer = new PluginInstaller(plugin, platforms, {
      claudeOnly: options.claudeOnly,
      opencodeOnly: options.opencodeOnly,
      dryRun: options.dryRun,
    });

    const results = await installer.install();
    allResults.push(...results);

    const success = results.every((r) => r.success);
    if (success) {
      spinner.stop(`${plugin.name} installed`);
    } else {
      spinner.stop(`${plugin.name} failed`);
    }
  }

  // Show results
  showResults(allResults);

  // Determine overall success
  const overallSuccess = allResults.every((r) => r.success);
  showOutro(overallSuccess);

  process.exit(overallSuccess ? 0 : 1);
}

/**
 * Parse CLI arguments
 */
function parseCLIArgs(args: string[]): CLIOptions {
  try {
    const { values } = parseArgs({
      args,
      options: {
        all: { type: "boolean", short: "a" },
        plugins: { type: "string", short: "p" },
        "claude-only": { type: "boolean" },
        "opencode-only": { type: "boolean" },
        yes: { type: "boolean", short: "y" },
        "dry-run": { type: "boolean" },
      },
      strict: false,
    });

    return {
      all: values.all as boolean,
      plugins: values.plugins ? (values.plugins as string).split(",") : undefined,
      claudeOnly: values["claude-only"] as boolean,
      opencodeOnly: values["opencode-only"] as boolean,
      yes: values.yes as boolean,
      dryRun: values["dry-run"] as boolean,
    };
  } catch (error) {
    console.error("Error parsing arguments:", error);
    process.exit(1);
  }
}

/**
 * Load marketplace configuration
 */
async function loadMarketplace(): Promise<MarketplaceConfig> {
  try {
    // Path to marketplace.json in the CLI package
    const marketplacePath = join(__dirname, "../../.claude-plugin/marketplace.json");
    const file = Bun.file(marketplacePath);
    const marketplace: MarketplaceConfig = await file.json();
    return marketplace;
  } catch (error) {
    console.error("Error loading marketplace.json:", error);
    process.exit(1);
  }
}
