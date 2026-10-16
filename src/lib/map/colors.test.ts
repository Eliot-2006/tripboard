import { describe, expect, it } from "vitest";
import { DAY_COLORS, dayColor, dayTextColor } from "@/lib/map/colors";

describe("dayColor", () => {
  it("has 8 distinct colors", () => {
    expect(DAY_COLORS).toHaveLength(8);
    expect(new Set(DAY_COLORS).size).toBe(8);
  });
  it("cycles after 8 days", () => {
    expect(dayColor(0)).toBe(DAY_COLORS[0]);
    expect(dayColor(8)).toBe(DAY_COLORS[0]);
    expect(dayColor(10)).toBe(DAY_COLORS[2]);
  });
});

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("dayTextColor", () => {
  it("is readable on every day color (at least 4.5:1)", () => {
    DAY_COLORS.forEach((bg, i) => {
      const [hi, lo] = [luminance(bg), luminance(dayTextColor(i))].sort((a, b) => b - a);
      expect((hi + 0.05) / (lo + 0.05), bg).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe("day inks on the dark paper (--background in globals.css)", () => {
  it("stay visible as non-text marks (at least 3:1)", () => {
    DAY_COLORS.forEach((ink) => {
      const [hi, lo] = [luminance(ink), luminance("#0d1117")].sort((a, b) => b - a);
      expect((hi + 0.05) / (lo + 0.05), ink).toBeGreaterThanOrEqual(3);
    });
  });
});
