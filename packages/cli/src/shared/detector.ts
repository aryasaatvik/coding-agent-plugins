/**
 * Platform detection logic
 */

import { existsSync } from "fs";
import { join } from "path";
import { $ } from "bun";
import type { PlatformInfo } from "./types";

export async function detectPlatforms(): Promise<PlatformInfo> {
  const info: PlatformInfo = {
    claudeCode: { detected: false },
    openCode: { detected: false },
  };

  // Claude Code detection
  const claudeDir = join(process.env.HOME!, ".claude");
  if (existsSync(claudeDir)) {
    info.claudeCode.detected = true;
    info.claudeCode.path = claudeDir;
  }

  // OpenCode detection
  const opencodeDir = join(process.env.HOME!, ".config", "opencode");
  const hasOpencode = existsSync(opencodeDir);
  const hasOpencodeCmd = await checkCommand("opencode");

  if (hasOpencode || hasOpencodeCmd) {
    info.openCode.detected = true;
    info.openCode.path = opencodeDir;
  }

  return info;
}

async function checkCommand(cmd: string): Promise<boolean> {
  try {
    await $`which ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function checkDependencies(platforms: PlatformInfo): Promise<{
  jq: boolean;
  bun: boolean;
}> {
  const checks = {
    jq: false,
    bun: false,
  };

  // Check for jq (required for Claude Code)
  if (platforms.claudeCode.detected) {
    try {
      await $`which jq`.quiet();
      checks.jq = true;
    } catch {
      checks.jq = false;
    }
  } else {
    checks.jq = true; // Not needed if Claude Code not detected
  }

  // Check for bun
  try {
    await $`which bun`.quiet();
    checks.bun = true;
  } catch {
    checks.bun = false;
  }

  return checks;
}
