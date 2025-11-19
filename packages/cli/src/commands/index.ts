/**
 * Command registry
 *
 * Maps command names to their handlers
 */

import { install } from "./install.js";

export type CommandHandler = (args: string[]) => Promise<void>;

export const commands: Record<string, CommandHandler> = {
  install,
  // Future commands:
  // update: updateCommand,
  // list: listCommand,
  // remove: removeCommand,
};
