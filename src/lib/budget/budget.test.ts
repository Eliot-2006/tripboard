import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import { formatMoney, itemCost, summarize } from "@/lib/budget";

describe("summarize (PRD 4.6 example)", () => {
  const items = [
    makeItem({ type: "flight", status: "reserved", payment_status: "paid", estimated_cost: 872 }),
    makeItem({ type: "stay", status: "reserved", payment_status: "unpaid", estimated_cost: 760 }),
    makeItem({ status: "planned", estimated_cost: 184 }),
    makeItem({ status: "idea", estimated_cost: 500 }),
  ];

  it("matches the worked example", () => {
    expect(summarize(items, 3000)).toEqual({
      estimated: 1816,
      paid: 872,
      remainingExpected: 944,
      budgetRemaining: 1184,
    });
  });

  it("hides budget remaining when no budget is set", () => {
    expect(summarize(items, null).budgetRemaining).toBeNull();
  });
});

describe("itemCost", () => {
  it("prefers actual over estimated, then falls back to 0", () => {
    expect(itemCost(makeItem({ estimated_cost: 100, actual_cost: 120 }))).toBe(120);
    expect(itemCost(makeItem({ estimated_cost: 100 }))).toBe(100);
    expect(itemCost(makeItem())).toBe(0);
  });
});

describe("edge cases", () => {
  it("handles a trip with no items", () => {
    expect(summarize([], 1000)).toEqual({ estimated: 0, paid: 0, remainingExpected: 0, budgetRemaining: 1000 });
    expect(summarize([], null).budgetRemaining).toBeNull();
  });

  it("does not leak floating-point error into totals", () => {
    const items = [makeItem({ estimated_cost: 0.1 }), makeItem({ estimated_cost: 0.2 })];
    expect(summarize(items, null).estimated).toBe(0.3);
  });

  it("goes negative when over budget", () => {
    expect(summarize([makeItem({ estimated_cost: 120 })], 100).budgetRemaining).toBe(-20);
  });
});

describe("formatMoney", () => {
  it("formats whole and negative amounts", () => {
    expect(formatMoney(1816, "USD")).toBe("$1,816");
    expect(formatMoney(-60, "USD")).toBe("-$60");
    expect(formatMoney(12.5, "USD")).toBe("$12.5");
  });
});
