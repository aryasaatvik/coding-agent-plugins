import { describe, test, expect } from "bun:test";
import { parseCommand, translateCommand, translate } from "../shared/translator";

describe("parseCommand", () => {
  test("parses npm install", () => {
    const result = parseCommand("npm install");
    expect(result).toEqual({
      pm: "npm",
      action: "install",
      args: [],
    });
  });

  test("parses yarn add with package", () => {
    const result = parseCommand("yarn add vite");
    expect(result).toEqual({
      pm: "yarn",
      action: "add",
      args: ["vite"],
    });
  });

  test("parses command with multiple args", () => {
    const result = parseCommand("npm install -D @types/node");
    expect(result).toEqual({
      pm: "npm",
      action: "install",
      args: ["-D", "@types/node"],
    });
  });

  test("returns null for non-pm commands", () => {
    expect(parseCommand("ls -la")).toBeNull();
    expect(parseCommand("git status")).toBeNull();
    expect(parseCommand("echo hello")).toBeNull();
  });

  test("handles empty string", () => {
    expect(parseCommand("")).toBeNull();
  });
});

describe("ni - install", () => {
  test("npm install → ni", () => {
    expect(translateCommand("npm install")).toBe("ni");
  });

  test("npm i → ni", () => {
    expect(translateCommand("npm i")).toBe("ni");
  });

  test("yarn install → ni", () => {
    expect(translateCommand("yarn install")).toBe("ni");
  });

  test("pnpm install → ni", () => {
    expect(translateCommand("pnpm install")).toBe("ni");
  });

  test("bun install → ni", () => {
    expect(translateCommand("bun install")).toBe("ni");
  });

  test("npm install vite → ni vite", () => {
    expect(translateCommand("npm install vite")).toBe("ni vite");
  });

  test("npm i vite → ni vite", () => {
    expect(translateCommand("npm i vite")).toBe("ni vite");
  });

  test("yarn add vite → ni vite", () => {
    expect(translateCommand("yarn add vite")).toBe("ni vite");
  });

  test("pnpm add vite → ni vite", () => {
    expect(translateCommand("pnpm add vite")).toBe("ni vite");
  });

  test("bun add vite → ni vite", () => {
    expect(translateCommand("bun add vite")).toBe("ni vite");
  });

  test("npm install @types/node -D → ni @types/node -D", () => {
    expect(translateCommand("npm install @types/node -D")).toBe(
      "ni @types/node -D"
    );
  });

  test("yarn add @types/node -D → ni @types/node -D", () => {
    expect(translateCommand("yarn add @types/node -D")).toBe(
      "ni @types/node -D"
    );
  });

  test("npm install -D typescript → ni -D typescript", () => {
    expect(translateCommand("npm install -D typescript")).toBe(
      "ni -D typescript"
    );
  });
});

describe("ni - global install", () => {
  test("npm install -g eslint → ni -g eslint", () => {
    expect(translateCommand("npm install -g eslint")).toBe("ni -g eslint");
  });

  test("npm i -g eslint → ni -g eslint", () => {
    expect(translateCommand("npm i -g eslint")).toBe("ni -g eslint");
  });

  test("yarn global add eslint → ni -g eslint", () => {
    expect(translateCommand("yarn global add eslint")).toBe("ni -g eslint");
  });

  test("pnpm add -g eslint → ni -g eslint", () => {
    expect(translateCommand("pnpm add -g eslint")).toBe("ni -g eslint");
  });

  test("bun add -g eslint → ni -g eslint", () => {
    expect(translateCommand("bun add -g eslint")).toBe("ni -g eslint");
  });

  test("npm install --global typescript → ni -g typescript", () => {
    expect(translateCommand("npm install --global typescript")).toBe(
      "ni -g typescript"
    );
  });
});

describe("nci - clean install", () => {
  test("npm ci → nci", () => {
    expect(translateCommand("npm ci")).toBe("nci");
  });

  test("npm install --frozen-lockfile → nci", () => {
    expect(translateCommand("npm install --frozen-lockfile")).toBe("nci");
  });

  test("yarn install --frozen-lockfile → nci", () => {
    expect(translateCommand("yarn install --frozen-lockfile")).toBe("nci");
  });

  test("pnpm install --frozen-lockfile → nci", () => {
    expect(translateCommand("pnpm install --frozen-lockfile")).toBe("nci");
  });

  test("yarn install --immutable → nci", () => {
    expect(translateCommand("yarn install --immutable")).toBe("nci");
  });
});

describe("nr - run", () => {
  test("npm run dev → nr dev", () => {
    expect(translateCommand("npm run dev")).toBe("nr dev");
  });

  test("yarn run dev → nr dev", () => {
    expect(translateCommand("yarn run dev")).toBe("nr dev");
  });

  test("pnpm run dev → nr dev", () => {
    expect(translateCommand("pnpm run dev")).toBe("nr dev");
  });

  test("bun run dev → nr dev", () => {
    expect(translateCommand("bun run dev")).toBe("nr dev");
  });

  test("npm run dev -- --port=3000 → nr dev -- --port=3000", () => {
    expect(translateCommand("npm run dev -- --port=3000")).toBe(
      "nr dev -- --port=3000"
    );
  });

  test("yarn dev (shorthand) → nr dev", () => {
    expect(translateCommand("yarn dev")).toBe("nr dev");
  });

  test("yarn build → nr build", () => {
    expect(translateCommand("yarn build")).toBe("nr build");
  });

  test("yarn test -- --coverage → nr test -- --coverage", () => {
    expect(translateCommand("yarn test -- --coverage")).toBe(
      "nr test -- --coverage"
    );
  });
});

describe("nlx - execute", () => {
  test("npx vitest → nlx vitest", () => {
    expect(translateCommand("npx vitest")).toBe("nlx vitest");
  });

  test("npx create-vite → nlx create-vite", () => {
    expect(translateCommand("npx create-vite")).toBe("nlx create-vite");
  });

  test("bunx vitest → nlx vitest", () => {
    expect(translateCommand("bunx vitest")).toBe("nlx vitest");
  });

  test("yarn dlx vitest → nlx vitest", () => {
    expect(translateCommand("yarn dlx vitest")).toBe("nlx vitest");
  });

  test("pnpm dlx vitest → nlx vitest", () => {
    expect(translateCommand("pnpm dlx vitest")).toBe("nlx vitest");
  });

  test("npx eslint --fix → nlx eslint --fix", () => {
    expect(translateCommand("npx eslint --fix")).toBe("nlx eslint --fix");
  });
});

describe("nun - uninstall", () => {
  test("npm uninstall webpack → nun webpack", () => {
    expect(translateCommand("npm uninstall webpack")).toBe("nun webpack");
  });

  test("npm remove webpack → nun webpack", () => {
    expect(translateCommand("npm remove webpack")).toBe("nun webpack");
  });

  test("yarn remove webpack → nun webpack", () => {
    expect(translateCommand("yarn remove webpack")).toBe("nun webpack");
  });

  test("pnpm remove webpack → nun webpack", () => {
    expect(translateCommand("pnpm remove webpack")).toBe("nun webpack");
  });

  test("bun remove webpack → nun webpack", () => {
    expect(translateCommand("bun remove webpack")).toBe("nun webpack");
  });

  test("npm uninstall -g silent → nun -g silent", () => {
    expect(translateCommand("npm uninstall -g silent")).toBe("nun -g silent");
  });

  test("yarn global remove silent → nun -g silent", () => {
    expect(translateCommand("yarn global remove silent")).toBe("nun -g silent");
  });
});

describe("nup - upgrade", () => {
  test("npm update → nup", () => {
    expect(translateCommand("npm update")).toBe("nup");
  });

  test("npm upgrade → nup", () => {
    expect(translateCommand("npm upgrade")).toBe("nup");
  });

  test("yarn upgrade → nup", () => {
    expect(translateCommand("yarn upgrade")).toBe("nup");
  });

  test("pnpm update → nup", () => {
    expect(translateCommand("pnpm update")).toBe("nup");
  });

  test("bun update → nup", () => {
    expect(translateCommand("bun update")).toBe("nup");
  });

  test("npm update vite → nup vite", () => {
    expect(translateCommand("npm update vite")).toBe("nup vite");
  });
});

describe("configuration", () => {
  test("respects disabledPackageManagers", () => {
    const config = { disabledPackageManagers: ["npm" as const] };

    expect(translateCommand("npm install vite", config)).toBeNull();
    expect(translateCommand("yarn add vite", config)).toBe("ni vite");
    expect(translateCommand("pnpm add vite", config)).toBe("ni vite");
  });

  test("disables multiple package managers", () => {
    const config = {
      disabledPackageManagers: ["npm" as const, "yarn" as const],
    };

    expect(translateCommand("npm install", config)).toBeNull();
    expect(translateCommand("yarn add vite", config)).toBeNull();
    expect(translateCommand("pnpm add vite", config)).toBe("ni vite");
    expect(translateCommand("bun add vite", config)).toBe("ni vite");
  });

  test("empty config uses defaults", () => {
    expect(translateCommand("npm install", {})).toBe("ni");
  });
});

describe("edge cases", () => {
  test("returns null for non-package-manager commands", () => {
    expect(translateCommand("ls -la")).toBeNull();
    expect(translateCommand("git commit -m 'test'")).toBeNull();
    expect(translateCommand("echo hello")).toBeNull();
    expect(translateCommand("cd ..")).toBeNull();
  });

  test("handles empty strings", () => {
    expect(translateCommand("")).toBeNull();
  });

  test("handles whitespace-only strings", () => {
    expect(translateCommand("   ")).toBeNull();
  });

  test("handles commands with extra whitespace", () => {
    expect(translateCommand("npm   install   vite")).toBe("ni vite");
  });

  test("handles yarn with unknown commands (not scripts)", () => {
    // yarn with a flag should not be translated
    expect(translateCommand("yarn --version")).toBeNull();
    expect(translateCommand("yarn -v")).toBeNull();
  });

  test("multiple packages", () => {
    expect(translateCommand("npm install react react-dom")).toBe(
      "ni react react-dom"
    );
  });

  test("scoped packages", () => {
    expect(translateCommand("npm install @types/node @types/react")).toBe(
      "ni @types/node @types/react"
    );
  });

  test("mixed flags and packages", () => {
    expect(translateCommand("npm install -D -E prettier")).toBe(
      "ni -D -E prettier"
    );
  });
});

describe("translate function", () => {
  test("returns detailed result for translated command", () => {
    const result = translate("npm install vite");

    expect(result).toEqual({
      original: "npm install vite",
      translated: "ni vite",
      wasTranslated: true,
    });
  });

  test("returns detailed result for non-translated command", () => {
    const result = translate("ls -la");

    expect(result).toEqual({
      original: "ls -la",
      translated: "ls -la",
      wasTranslated: false,
    });
  });
});
