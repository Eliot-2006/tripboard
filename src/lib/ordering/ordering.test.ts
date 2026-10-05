import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import {
  insertPositionByTime,
  needsRenumber,
  positionBetween,
  renumber,
  sortItems,
  visibleItems,
} from "@/lib/ordering";

describe("positionBetween", () => {
  it("takes the midpoint of two neighbors", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });
  it("extends past the ends", () => {
    expect(positionBetween(null, 3000)).toBe(2000);
    expect(positionBetween(1000, null)).toBe(2000);
  });
  it("starts an empty day at 1000", () => {
    expect(positionBetween(null, null)).toBe(1000);
  });
});

describe("renumbering", () => {
  it("detects gaps smaller than epsilon", () => {
    expect(needsRenumber([1000, 1000.0000001])).toBe(true);
    expect(needsRenumber([1000, 2000])).toBe(false);
    expect(needsRenumber([])).toBe(false);
  });
  it("sorts and spaces positions evenly", () => {
    const out = renumber([
      { id: "a", position: 1000.0000001 },
      { id: "b", position: 1000 },
    ]);
    expect(out).toEqual([
      { id: "b", position: 1000 },
      { id: "a", position: 2000 },
    ]);
  });
});

describe("sortItems / visibleItems", () => {
  const a = makeItem({ id: "a", day: "2027-04-11", position: 1000 });
  const b = makeItem({ id: "b", day: "2027-04-10", position: 2000 });
  const c = makeItem({ id: "c", day: "2027-04-10", position: 1000 });

  it("sorts by day then position without mutating", () => {
    const input = [a, b, c];
    expect(sortItems(input).map((i) => i.id)).toEqual(["c", "b", "a"]);
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by an inclusive range", () => {
    expect(visibleItems([a, b, c], { start: "2027-04-11", end: "2027-04-11" }).map((i) => i.id)).toEqual(["a"]);
  });

  it("returns nothing when the range misses every item", () => {
    expect(visibleItems([a, b, c], { start: "2027-05-01", end: "2027-05-02" })).toEqual([]);
  });
});

describe("insertPositionByTime", () => {
  const nine = makeItem({ start_at: "2027-04-10T09:00:00.000Z", position: 1000 });
  const one = makeItem({ start_at: "2027-04-10T13:00:00.000Z", position: 2000 });
  const flexible = makeItem({ is_flexible: true, start_at: null, position: 3000 });
  const day = [nine, one, flexible];

  it("inserts between neighbors by start time", () => {
    expect(insertPositionByTime(day, "2027-04-10T11:00:00.000Z")).toBe(1500);
  });
  it("inserts before the first later item", () => {
    expect(insertPositionByTime(day, "2027-04-10T08:00:00.000Z")).toBe(0);
  });
  it("appends after the last item when nothing timed is later", () => {
    expect(insertPositionByTime(day, "2027-04-10T15:00:00.000Z")).toBe(4000);
  });
  it("appends flexible (untimed) items", () => {
    expect(insertPositionByTime(day, null)).toBe(4000);
  });
  it("handles an empty day", () => {
    expect(insertPositionByTime([], "2027-04-10T09:00:00.000Z")).toBe(1000);
  });
});
