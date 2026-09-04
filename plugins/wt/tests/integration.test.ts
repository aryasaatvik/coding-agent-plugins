import { describe, test, expect } from "bun:test";

describe("OpenCode plugin integration", () => {
  async function loadPlugin() {
    const module = await import("../opencode/wt-plugin.ts");
    const plugin = module.default as {
      id: string;
      setup: (ctx: {
        location: { directory: string };
        tool: {
          hook: (
            name: "execute.before",
            callback: (event: { tool: string; input: unknown }) => Promise<void> | void,
          ) => Promise<{ dispose: () => Promise<void> }>;
        };
      }) => Promise<() => Promise<void>>;
    };

    let handler: ((event: { tool: string; input: unknown }) => Promise<void> | void) | undefined;
    let disposed = false;
    const cleanup = await plugin.setup({
      location: { directory: "/tmp" },
      tool: {
        hook: async (_name, callback) => {
          handler = callback;
          return {
            dispose: async () => {
              disposed = true;
            },
          };
        },
      },
    });

    if (!handler) {
      throw new Error("plugin did not register execute.before");
    }

    return { plugin, handler, cleanup, disposed: () => disposed };
  }

  test("plugin exports a V2 default definition", async () => {
    const module = await import("../opencode/wt-plugin.ts");
    expect(module.default).toMatchObject({ id: "wt-plugin" });
    expect(typeof module.default.setup).toBe("function");
  });

  test("plugin blocks git worktree add with a wt suggestion", async () => {
    const { handler, cleanup } = await loadPlugin();
    const input = { command: "git worktree add -b feature/x ../x main" };
    expect(handler({ tool: "shell", input })).rejects.toThrow(/wt-plugin/);
    expect(handler({ tool: "shell", input })).rejects.toThrow(/wt new/);
    await cleanup();
  });

  test("plugin passes through non-shell commands", async () => {
    const { handler, cleanup } = await loadPlugin();
    const input = { filePath: "/tmp/test.txt" };
    await handler({ tool: "read", input });
    expect(input).toEqual({ filePath: "/tmp/test.txt" });
    await cleanup();
  });

  test("plugin passes through non-add shell commands", async () => {
    const { handler, cleanup } = await loadPlugin();
    const input = { command: "git worktree list" };
    await handler({ tool: "shell", input });
    expect(input.command).toBe("git worktree list");
    await cleanup();
  });

  test("cleanup disposes the registration", async () => {
    const { cleanup, disposed } = await loadPlugin();
    expect(disposed()).toBe(false);
    await cleanup();
    expect(disposed()).toBe(true);
  });
});
