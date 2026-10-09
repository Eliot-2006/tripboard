import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/budget";
import { localDay } from "@/lib/time";
import { DEMO_TRIP_ID, loadDemoSeed } from "./demo-seed";

describe("demo seed (DEMO-4)", () => {
  const { trips, items } = loadDemoSeed();

  it("parses against the schemas and has one trip", () => {
    expect(trips.map((t) => t.id)).toEqual([DEMO_TRIP_ID]);
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(items.every((i) => i.trip_id === DEMO_TRIP_ID)).toBe(true);
  });

  it("covers every item type, a flexible item, an idea and a paid item", () => {
    expect(new Set(items.map((i) => i.type))).toEqual(new Set(["flight", "stay", "activity"]));
    expect(items.some((i) => i.is_flexible)).toBe(true);
    expect(items.some((i) => i.status === "idea")).toBe(true);
    expect(items.some((i) => i.payment_status === "paid")).toBe(true);
  });

  it("has an overnight cross-time-zone flight", () => {
    const flight = items.find((i) => i.type === "flight")!;
    const dep = localDay(flight.start_at!, flight.start_timezone!);
    const arr = localDay(flight.end_at!, flight.end_timezone!);
    expect(arr > dep).toBe(true);
    expect(flight.start_timezone).not.toBe(flight.end_timezone);
  });

  it("puts every timed item on the local day of its start", () => {
    for (const i of items.filter((x) => x.start_at)) {
      expect(localDay(i.start_at!, i.start_timezone!), i.title).toBe(i.day);
    }
  });

  it("stays inside the trip dates", () => {
    const { start_date, end_date } = trips[0];
    for (const i of items) expect(i.day >= start_date && i.day <= end_date, i.title).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it("budget numbers are the known values", () => {
    expect(summarize(items, trips[0].total_budget)).toEqual({
      estimated: 2940,
      paid: 907,
      remainingExpected: 2033,
      budgetRemaining: 60,
    });
  });
});
