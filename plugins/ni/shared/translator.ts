/**
 * Package manager command translation logic
 */

import type { Config, PackageManager, ParsedCommand } from "./types";

/**
 * Parse a command string into its components
 */
export function parseCommand(command: string): ParsedCommand | null {
  const parts = command.trim().split(/\s+/);
  const pm = parts[0] as PackageManager;

  // Check if it's a package manager command we care about
  if (!["npm", "yarn", "pnpm", "bun", "npx", "bunx"].includes(pm)) {
    return null;
  }

  const action = parts[1] || "";
  const args = parts.slice(2);

  return { pm, action, args };
}

/**
 * Translate a package manager command to its ni equivalent
 */
export function translateCommand(command: string, config: Config = {}): string | null {
  const parsed = parseCommand(command);
  if (!parsed) return null;

  const { pm, action, args } = parsed;

  // Check if this package manager is disabled
  if (config.disabledPackageManagers?.includes(pm)) {
    return null;
  }

  const argsStr = args.join(" ");

  // Handle npx/bunx - always translate to nlx
  if (pm === "npx" || pm === "bunx") {
    return `nlx ${action} ${argsStr}`.trim();
  }

  // Handle yarn dlx
  if (pm === "yarn" && action === "dlx") {
    return `nlx ${argsStr}`.trim();
  }

  // Handle pnpm dlx
  if (pm === "pnpm" && action === "dlx") {
    return `nlx ${argsStr}`.trim();
  }

  // Map package manager actions to ni commands
  switch (action) {
    case "install":
    case "i":
      // Handle special flags
      if (args.includes("-g") || args.includes("--global")) {
        const packages = args.filter(
          (arg) => !arg.startsWith("-") && arg !== "install" && arg !== "i"
        );
        return `ni -g ${packages.join(" ")}`.trim();
      }
      if (args.includes("--frozen-lockfile") || args.includes("--immutable")) {
        return "nci";
      }
      // Regular install
      if (args.length === 0) {
        return "ni";
      }
      return `ni ${argsStr}`;

    case "ci":
      return "nci";

    case "add":
      if (args.includes("-g") || args.includes("--global")) {
        const packages = args.filter((arg) => !arg.startsWith("-"));
        return `ni -g ${packages.join(" ")}`.trim();
      }
      return `ni ${argsStr}`;

    case "run":
      return `nr ${argsStr}`;

    case "remove":
    case "uninstall":
    case "rm":
      if (args.includes("-g") || args.includes("--global")) {
        const packages = args.filter((arg) => !arg.startsWith("-"));
        return `nun -g ${packages.join(" ")}`.trim();
      }
      return `nun ${argsStr}`;

    case "update":
    case "upgrade":
    case "up":
      return args.length > 0 ? `nup ${argsStr}` : "nup";

    case "global":
      // yarn global add
      if (pm === "yarn" && args[0] === "add") {
        return `ni -g ${args.slice(1).join(" ")}`.trim();
      }
      // yarn global remove
      if (pm === "yarn" && args[0] === "remove") {
        return `nun -g ${args.slice(1).join(" ")}`.trim();
      }
      break;

    default:
      // For yarn, check if action looks like a script name (no special command)
      if (pm === "yarn" && action && !action.startsWith("-")) {
        // Could be "yarn dev" -> "nr dev"
        return `nr ${action} ${argsStr}`.trim();
      }
      break;
  }

  return null;
}

/**
 * Translate a command and return detailed result
 */
export function translate(command: string, config: Config = {}) {
  const translated = translateCommand(command, config);

  return {
    original: command,
    translated: translated || command,
    wasTranslated: translated !== null,
  };
}
