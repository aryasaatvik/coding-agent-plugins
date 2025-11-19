/**
 * Shared types for the installer framework
 */

export interface PluginConfig {
  name: string;
  path: string;
  description: string;
  version: string;
  author: { name: string; email?: string };
  license: string;
  category: string;
  tags: string[];
  platforms: ("claude" | "opencode")[];
  homepage?: string;
}

export interface MarketplaceConfig {
  name: string;
  owner: { name: string; email: string };
  metadata: {
    description: string;
    version: string;
  };
  plugins: PluginConfig[];
}

export interface PlatformInfo {
  claudeCode: {
    detected: boolean;
    path?: string;
    version?: string;
  };
  openCode: {
    detected: boolean;
    path?: string;
    version?: string;
  };
}

export interface CLIOptions {
  all?: boolean;
  plugins?: string[];
  claudeOnly?: boolean;
  opencodeOnly?: boolean;
  yes?: boolean;
  dryRun?: boolean;
}

export interface InstallOptions {
  claudeOnly?: boolean;
  opencodeOnly?: boolean;
  dryRun?: boolean;
}

export interface InstallResult {
  plugin: string;
  platform: "claude" | "opencode";
  success: boolean;
  error?: string;
}
