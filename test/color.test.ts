import { describe, expect, test } from "bun:test";
import { hexColorToDecimal, REDDIT_ORANGE } from "@/embed/color";

describe("hexColorToDecimal", () => {
  test("converts a hex color with a leading #", () => {
    expect(hexColorToDecimal("#ff4500")).toBe(16_729_344);
    expect(hexColorToDecimal("#ff4500")).toBe(REDDIT_ORANGE);
  });

  test("accepts uppercase and a missing #", () => {
    expect(hexColorToDecimal("#FF4500")).toBe(REDDIT_ORANGE);
    expect(hexColorToDecimal("ff4500")).toBe(REDDIT_ORANGE);
  });

  test("ignores surrounding whitespace", () => {
    expect(hexColorToDecimal("  #ff4500 ")).toBe(REDDIT_ORANGE);
  });

  test("handles the extremes", () => {
    expect(hexColorToDecimal("#000000")).toBe(0);
    expect(hexColorToDecimal("#ffffff")).toBe(0xffffff);
  });

  test("returns undefined for the empty string Reddit uses for unset colors", () => {
    expect(hexColorToDecimal("")).toBeUndefined();
    expect(hexColorToDecimal("   ")).toBeUndefined();
  });

  test("returns undefined for anything that is not a 6-digit hex color", () => {
    for (const bad of ["12zz", "#12zz00", "#f40", "#ff45001", "red", "#"]) {
      expect(hexColorToDecimal(bad)).toBeUndefined();
    }
  });
});
