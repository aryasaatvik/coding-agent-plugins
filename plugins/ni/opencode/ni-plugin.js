// @bun
// shared/translator.ts
function parseCommand(command) {
  const parts = command.trim().split(/\s+/);
  const pm = parts[0];
  if (!["npm", "yarn", "pnpm", "bun", "npx", "bunx"].includes(pm)) {
    return null;
  }
  const action = parts[1] || "";
  const args = parts.slice(2);
  return { pm, action, args };
}
function translateCommand(command, config = {}) {
  const parsed = parseCommand(command);
  if (!parsed)
    return null;
  const { pm, action, args } = parsed;
  if (config.disabledPackageManagers?.includes(pm)) {
    return null;
  }
  const argsStr = args.join(" ");
  if (pm === "npx" || pm === "bunx") {
    return `nlx ${action} ${argsStr}`.trim();
  }
  if (pm === "yarn" && action === "dlx") {
    return `nlx ${argsStr}`.trim();
  }
  if (pm === "pnpm" && action === "dlx") {
    return `nlx ${argsStr}`.trim();
  }
  switch (action) {
    case "install":
    case "i":
      if (args.includes("-g") || args.includes("--global")) {
        const packages = args.filter((arg) => !arg.startsWith("-") && arg !== "install" && arg !== "i");
        return `ni -g ${packages.join(" ")}`.trim();
      }
      if (args.includes("--frozen-lockfile") || args.includes("--immutable")) {
        return "nci";
      }
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
      if (pm === "yarn" && args[0] === "add") {
        return `ni -g ${args.slice(1).join(" ")}`.trim();
      }
      if (pm === "yarn" && args[0] === "remove") {
        return `nun -g ${args.slice(1).join(" ")}`.trim();
      }
      break;
    default:
      if (pm === "yarn" && action && !action.startsWith("-")) {
        return `nr ${action} ${argsStr}`.trim();
      }
      break;
  }
  return null;
}

// shared/config.ts
import { existsSync } from "fs";
import { join } from "path";
function getDefaultConfig() {
  return {
    enabled: true,
    dryRun: false,
    debug: false,
    disabledPackageManagers: []
  };
}
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    return getDefaultConfig();
  }
  const c = config;
  const defaults = getDefaultConfig();
  const validated = {
    enabled: typeof c.enabled === "boolean" ? c.enabled : defaults.enabled,
    dryRun: typeof c.dryRun === "boolean" ? c.dryRun : defaults.dryRun,
    debug: typeof c.debug === "boolean" ? c.debug : defaults.debug,
    disabledPackageManagers: Array.isArray(c.disabledPackageManagers) ? c.disabledPackageManagers.filter((pm) => typeof pm === "string" && ["npm", "yarn", "pnpm", "bun", "npx", "bunx"].includes(pm)) : defaults.disabledPackageManagers
  };
  return validated;
}
async function loadConfigFile(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const file = Bun.file(path);
    const content = await file.json();
    return validateConfig(content);
  } catch (error) {
    return null;
  }
}
async function loadConfig(cwd) {
  const configPaths = [
    join(cwd, ".ni-plugin.json"),
    join(process.env.HOME || "~", ".config", "ni-plugin", "config.json")
  ];
  for (const path of configPaths) {
    const config = await loadConfigFile(path);
    if (config !== null) {
      return config;
    }
  }
  return getDefaultConfig();
}

// opencode/ni-plugin.ts
var NiPlugin = async ({ directory }) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash" && input.tool !== "shell") {
        return;
      }
      const command = output.args?.command;
      if (!command || typeof command !== "string") {
        return;
      }
      try {
        const config = await loadConfig(directory);
        if (!config.enabled) {
          return;
        }
        if (config.debug) {
          console.error(`[ni-plugin] Processing command: ${command}`);
          console.error(`[ni-plugin] Config:`, JSON.stringify(config));
        }
        const translated = translateCommand(command, config);
        if (translated) {
          if (config.dryRun) {
            console.log(`[ni-plugin] [DRY RUN] Would translate: '${command}' \u2192 '${translated}'`);
            return;
          }
          output.args.command = translated;
        }
      } catch (error) {
        console.error("[ni-plugin] Error:", error);
      }
    }
  };
};
export {
  NiPlugin
};
