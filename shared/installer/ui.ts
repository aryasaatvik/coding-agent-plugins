/**
 * Interactive terminal UI using @clack/prompts
 */

import { intro, outro, multiselect, confirm, log, spinner } from "@clack/prompts";
import type { PluginConfig, PlatformInfo, InstallResult } from "./types";

export function showIntro() {
  intro("🔌 Coding Agent Plugins Installer");
}

export function showOutro(success: boolean) {
  if (success) {
    outro("✨ Installation complete!");
  } else {
    outro("❌ Installation failed");
  }
}

export async function showPluginSelector(
  plugins: PluginConfig[],
  options: { preSelected?: string[] } = {}
): Promise<string[]> {
  const selected = await multiselect({
    message: "Select plugins to install:",
    options: plugins.map((p) => ({
      value: p.name,
      label: p.name,
      hint: p.description,
    })),
    required: true,
    initialValues: options.preSelected,
  });

  if (typeof selected === "symbol") {
    process.exit(0);
  }

  return selected as string[];
}

export function showPlatformDetection(detected: PlatformInfo): void {
  log.info("Detected platforms:");
  if (detected.claudeCode.detected) {
    log.success(`✓ Claude Code (${detected.claudeCode.path})`);
  }
  if (detected.openCode.detected) {
    log.success(`✓ OpenCode (${detected.openCode.path})`);
  }
  if (!detected.claudeCode.detected && !detected.openCode.detected) {
    log.warn("⚠ No platforms detected");
  }
}

export async function confirmInstall(
  plugins: string[],
  platforms: string[]
): Promise<boolean> {
  const result = await confirm({
    message: `Install ${plugins.length} plugin(s) for ${platforms.join(" & ")}?`,
  });

  if (typeof result === "symbol") {
    process.exit(0);
  }

  return result as boolean;
}

export function showMissingDependencies(deps: { jq?: boolean; bun?: boolean }): void {
  log.error("Missing dependencies:");

  if (deps.jq === false) {
    log.error("  ✗ jq (required for Claude Code)");
    log.info("");
    log.info("Install jq:");
    log.info("  # macOS");
    log.info("  brew install jq");
    log.info("");
    log.info("  # Linux (Debian/Ubuntu)");
    log.info("  sudo apt-get install jq");
    log.info("");
    log.info("  # Linux (RHEL/CentOS)");
    log.info("  sudo yum install jq");
  }

  if (deps.bun === false) {
    log.error("  ✗ bun");
    log.info("");
    log.info("Install bun:");
    log.info("  curl -fsSL https://bun.sh/install | bash");
  }
}

export function createSpinner(message: string) {
  return spinner();
}

export function showResults(results: InstallResult[]): void {
  log.info("");
  log.info("Installation results:");

  for (const result of results) {
    if (result.success) {
      log.success(`✓ ${result.plugin} (${result.platform})`);
    } else {
      log.error(`✗ ${result.plugin} (${result.platform}): ${result.error}`);
    }
  }
}

export function showDryRunMode(): void {
  log.warn("🔍 Dry-run mode - no changes will be made");
}
