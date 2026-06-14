import { describe, test, expect } from "bun:test";
import { getDefaultConfig, validateConfig } from "../shared/config";

describe("getDefaultConfig", () => {
  test("returns sensible defaults", () => {
    expect(getDefaultConfig()).toEqual({
      enabled: true,
      dryRun: false,
      debug: false,
      defaultBase: "main",
    });
  });
});

describe("validateConfig", () => {
  test("non-object input falls back to defaults", () => {
    expect(validateConfig(null)).toEqual(getDefaultConfig());
    expect(validateConfig(undefined)).toEqual(getDefaultConfig());
    expect(validateConfig("nope")).toEqual(getDefaultConfig());
  });

  test("coerces invalid field types to defaults", () => {
    expect(
      validateConfig({ enabled: "yes", dryRun: 1, debug: null, defaultBase: 42 })
    ).toEqual(getDefaultConfig());
  });

  test("passes through valid values", () => {
    expect(
      validateConfig({
        enabled: false,
        dryRun: true,
        debug: true,
        defaultBase: "develop",
      })
    ).toEqual({
      enabled: false,
      dryRun: true,
      debug: true,
      defaultBase: "develop",
    });
  });

  test("blank defaultBase falls back to main", () => {
    expect(validateConfig({ defaultBase: "   " }).defaultBase).toBe("main");
  });
});
