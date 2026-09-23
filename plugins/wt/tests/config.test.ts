import { describe, test, expect } from "bun:test";
import { getDefaultConfig, validateConfig } from "../shared/config";

describe("getDefaultConfig", () => {
  test("returns sensible defaults", () => {
    expect(getDefaultConfig()).toEqual({
      enabled: true,
      dryRun: false,
      debug: false,
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
      validateConfig({ enabled: "yes", dryRun: 1, debug: null })
    ).toEqual(getDefaultConfig());
  });

  test("passes through valid values", () => {
    expect(
      validateConfig({
        enabled: false,
        dryRun: true,
        debug: true,
      })
    ).toEqual({
      enabled: false,
      dryRun: true,
      debug: true,
    });
  });

  test("drops unknown keys such as the removed defaultBase", () => {
    expect(validateConfig({ defaultBase: "develop" })).toEqual(
      getDefaultConfig()
    );
  });
});
