import { describe, test, expect } from "bun:test";
import { parseWorktreeAdd, analyzeCommand } from "../shared/translator";

describe("parseWorktreeAdd", () => {
  test("parses -b new branch with base", () => {
    expect(parseWorktreeAdd("git worktree add -b feature/x ../x main")).toEqual({
      branch: "feature/x",
      base: "main",
      checkoutExisting: false,
    });
  });

  test("parses -b new branch without base", () => {
    expect(parseWorktreeAdd("git worktree add -b feat ../feat")).toEqual({
      branch: "feat",
      base: undefined,
      checkoutExisting: false,
    });
  });

  test("parses checkout of existing ref", () => {
    expect(parseWorktreeAdd("git worktree add ../x existing-branch")).toEqual({
      branch: "existing-branch",
      base: undefined,
      checkoutExisting: true,
    });
  });

  test("derives branch from path basename", () => {
    expect(parseWorktreeAdd("git worktree add ../x-feature")).toEqual({
      branch: "x-feature",
      base: undefined,
      checkoutExisting: false,
    });
  });

  test("handles `git -C <dir>` prefix", () => {
    expect(
      parseWorktreeAdd("git -C /repo worktree add -b feat ../feat develop")
    ).toEqual({ branch: "feat", base: "develop", checkoutExisting: false });
  });

  test("-B behaves like -b", () => {
    expect(parseWorktreeAdd("git worktree add -B feat ../feat")).toEqual({
      branch: "feat",
      base: undefined,
      checkoutExisting: false,
    });
  });

  test("returns null for non-add worktree subcommands", () => {
    expect(parseWorktreeAdd("git worktree list")).toBeNull();
    expect(parseWorktreeAdd("git worktree remove ../x")).toBeNull();
    expect(parseWorktreeAdd("git worktree prune")).toBeNull();
  });

  test("returns null for unrelated commands", () => {
    expect(parseWorktreeAdd("git status")).toBeNull();
    expect(parseWorktreeAdd("ls -la")).toBeNull();
    expect(parseWorktreeAdd("worktree add ../x")).toBeNull(); // no `git`
  });

  test("returns null for passthrough flags wt cannot express", () => {
    expect(parseWorktreeAdd("git worktree add --detach ../x main")).toBeNull();
    expect(parseWorktreeAdd("git worktree add --no-checkout ../x")).toBeNull();
    expect(parseWorktreeAdd("git worktree add --orphan ../x")).toBeNull();
  });
});

describe("analyzeCommand - suggestions", () => {
  test("-b with base → wt new <branch> <base>", () => {
    const r = analyzeCommand("git worktree add -b feature/x ../x main");
    expect(r?.suggestion).toBe("wt new feature/x main");
  });

  test("-b without base → wt new <branch>", () => {
    const r = analyzeCommand("git worktree add -b feat ../feat");
    expect(r?.suggestion).toBe("wt new feat");
  });

  test("existing ref → wt new <ref> (no base)", () => {
    const r = analyzeCommand("git worktree add ../x existing");
    expect(r?.suggestion).toBe("wt new existing");
  });

  test("path-only → wt new <basename>", () => {
    const r = analyzeCommand("git worktree add ../x-feature");
    expect(r?.suggestion).toBe("wt new x-feature");
  });

  test("reason explains wt and the bypass", () => {
    const r = analyzeCommand("git worktree add -b feat ../feat");
    expect(r?.reason).toContain("wt new feat");
    expect(r?.reason).toContain("WT_HOOK_OFF=1");
    expect(r?.reason).toContain("syncs gitignored files");
  });

  test("respects a custom defaultBase in the base note", () => {
    const r = analyzeCommand("git worktree add -b feat ../feat", {
      defaultBase: "develop",
    });
    expect(r?.reason).toContain("`develop`");
  });
});

describe("analyzeCommand - passthrough", () => {
  test("returns null for non-add commands", () => {
    expect(analyzeCommand("git worktree list")).toBeNull();
    expect(analyzeCommand("git worktree remove ../x")).toBeNull();
    expect(analyzeCommand("git status")).toBeNull();
    expect(analyzeCommand("ls -la")).toBeNull();
  });

  test("returns null for structural flags wt cannot express", () => {
    expect(analyzeCommand("git worktree add --detach ../x main")).toBeNull();
    expect(analyzeCommand("git worktree add --no-checkout ../x")).toBeNull();
    expect(analyzeCommand("git worktree add --orphan ../x")).toBeNull();
  });

  test("WT_HOOK_OFF=1 prefix bypasses the nudge", () => {
    expect(
      analyzeCommand("WT_HOOK_OFF=1 git worktree add -b feat ../feat")
    ).toBeNull();
  });

  test("handles empty / whitespace input", () => {
    expect(analyzeCommand("")).toBeNull();
    expect(analyzeCommand("   ")).toBeNull();
  });
});
