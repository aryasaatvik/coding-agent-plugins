/**
 * Shared TypeScript types for ni-plugin
 */

/**
 * Supported package managers
 */
export type PackageManager = "npm" | "yarn" | "pnpm" | "bun" | "npx" | "bunx";

/**
 * Plugin configuration options
 */
export interface Config {
  /**
   * Enable or disable the plugin entirely
   * @default true
   */
  enabled?: boolean;

  /**
   * Dry run mode - show translations without executing
   * @default false
   */
  dryRun?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Package managers to NOT translate
   * @default []
   */
  disabledPackageManagers?: PackageManager[];
}

/**
 * Parsed command structure
 */
export interface ParsedCommand {
  /**
   * Package manager detected
   */
  pm: PackageManager;

  /**
   * Command action (install, run, remove, etc.)
   */
  action: string;

  /**
   * Command arguments
   */
  args: string[];
}

/**
 * Translation result
 */
export interface TranslationResult {
  /**
   * Original command
   */
  original: string;

  /**
   * Translated command
   */
  translated: string;

  /**
   * Whether translation occurred
   */
  wasTranslated: boolean;
}
