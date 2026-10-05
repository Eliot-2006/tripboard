import { describe, expect, it } from "vitest";
import { DAY_COLORS, dayColor } from "@/lib/map/colors";

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
