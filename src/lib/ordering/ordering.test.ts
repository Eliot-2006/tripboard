import { describe, expect, it } from "vitest";
import { loadDemoSeed } from "@/lib/data/demo-seed";
import { NewItemSchema } from "@/types/schemas";
import { makeItem } from "@/test/factories";
import {
  applyMove,
  duplicateOf,
  insertPositionByTime,
  planMove,
  planMoveToDay,
  positionBetween,
  sortItems,
  stayContinuations,
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

describe("planMove (ITIN-5, ITIN-6)", () => {
  const day = [makeItem({ id: "a", position: 1000 }), makeItem({ id: "b", position: 2000 }), makeItem({ id: "c", position: 3000 })];

  it("takes the midpoint of the new neighbours, changing only the moved item", () => {
    expect(planMove("x", "2027-04-12", day, 1)).toEqual({ id: "x", day: "2027-04-12", position: 1500, renumber: [] });
  });

  it("goes before the first item, after the last, or into an empty day", () => {
    expect(planMove("x", "d", day, 0).position).toBe(0);
    expect(planMove("x", "d", day, 3).position).toBe(4000);
    expect(planMove("x", "d", day, 99).position).toBe(4000);
    expect(planMove("x", "d", [], 0).position).toBe(1000);
  });

  it("renumbers the day when the gap has collapsed", () => {
    const tight = [makeItem({ id: "a", position: 1000 }), makeItem({ id: "b", position: 1000 + 1e-7 })];
    expect(planMove("x", "d", tight, 1)).toEqual({
      id: "x",
      day: "d",
      position: 2000,
      renumber: [{ id: "b", position: 3000 }],
    });
  });
});

describe("planMoveToDay (ITIN-7)", () => {
  it("places the item by its start time on the new day, keeping its clock time", () => {
    const morning = makeItem({ id: "m", day: "2027-04-14", position: 1000, start_at: "2027-04-14T00:00:00.000Z" });
    const evening = makeItem({ id: "e", day: "2027-04-14", position: 2000, start_at: "2027-04-14T10:00:00.000Z" });
    const lunch = makeItem({
      id: "l",
      day: "2027-04-12",
      start_at: "2027-04-12T03:00:00.000Z", // noon in Tokyo
      start_timezone: "Asia/Tokyo",
    });
    expect(planMoveToDay(lunch, "2027-04-14", [morning, evening, lunch])).toEqual({
      id: "l",
      day: "2027-04-14",
      position: 1500,
      renumber: [],
    });
  });
});

describe("applyMove", () => {
  it("moves the item, shifts its times to the new day, renumbers neighbours and keeps the order", () => {
    const a = makeItem({ id: "a", day: "2027-04-12", position: 1000 });
    const b = makeItem({
      id: "b",
      day: "2027-04-12",
      position: 2000,
      start_at: "2027-04-12T00:00:00.000Z",
      start_timezone: "Asia/Tokyo",
    });
    const c = makeItem({ id: "c", day: "2027-04-13", position: 1000 });
    const moved = applyMove([a, b, c], { id: "b", day: "2027-04-13", position: 500, renumber: [{ id: "c", position: 2000 }] });
    expect(moved.map((i) => [i.id, i.day, i.position])).toEqual([
      ["a", "2027-04-12", 1000],
      ["b", "2027-04-13", 500],
      ["c", "2027-04-13", 2000],
    ]);
    expect(moved[1].start_at).toBe("2027-04-13T00:00:00.000Z");
    expect(b.day).toBe("2027-04-12"); // inputs untouched
  });
});

describe("stayContinuations (ITIN-8)", () => {
  const { items } = loadDemoSeed();
  const days = ["2027-04-11", "2027-04-12", "2027-04-13", "2027-04-14", "2027-04-15", "2027-04-16", "2027-04-17"];

  it("lists each stay on the nights between check-in and check-out", () => {
    const titles = Object.fromEntries(Object.entries(stayContinuations(items, days)).map(([d, s]) => [d, s.map((i) => i.title)]));
    expect(titles).toEqual({
      "2027-04-11": [],
      "2027-04-12": ["Hotel Gracery Shinjuku"],
      "2027-04-13": ["Hotel Gracery Shinjuku"],
      "2027-04-14": [],
      "2027-04-15": ["Kyoto Machiya Inn"],
      "2027-04-16": ["Kyoto Machiya Inn"],
      "2027-04-17": [],
    });
  });

  it("ignores stays without a check-out", () => {
    const open = makeItem({ type: "stay", day: "2027-04-10", end_at: null });
    expect(stayContinuations([open], ["2027-04-11"])).toEqual({ "2027-04-11": [] });
  });
});

describe("duplicateOf (ITEM-12)", () => {
  const paid = makeItem({
    id: "a",
    day: "2027-04-12",
    position: 1000,
    status: "reserved",
    payment_status: "paid",
    confirmation_number: "ABC123",
    actual_cost: 80,
    estimated_cost: 75,
  });
  const next = makeItem({ id: "b", day: "2027-04-12", position: 2000 });

  it("goes right after the original and is not a second booking", () => {
    const copy = duplicateOf(paid, [next, paid]);
    expect(copy).toMatchObject({
      title: paid.title,
      day: paid.day,
      start_at: paid.start_at,
      estimated_cost: 75,
      position: 1500,
      status: "planned",
      payment_status: "unpaid",
      confirmation_number: null,
      actual_cost: null,
    });
    expect(copy).not.toHaveProperty("id");
    expect(NewItemSchema.safeParse(copy).success).toBe(true);
  });

  it("goes last when the original is last, and keeps an idea an idea", () => {
    const idea = makeItem({ id: "c", position: 3000, status: "idea" });
    expect(duplicateOf(idea, [idea])).toMatchObject({ position: 4000, status: "idea" });
  });
});
