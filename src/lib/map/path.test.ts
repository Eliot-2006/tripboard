import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import { DAY_COLORS } from "@/lib/map/colors";
import { arcPoints, buildPath, distanceKm, longitudeShift, mapStops } from "@/lib/map/path";

const at = (lat: number, lng: number) => ({ start_lat: lat, start_lng: lng });

describe("distanceKm", () => {
  it("is zero for the same point and about 111 km per degree of latitude", () => {
    expect(distanceKm([10, 20], [10, 20])).toBe(0);
    expect(distanceKm([0, 0], [1, 0])).toBeCloseTo(111.19, 1);
  });

  it("measures Los Angeles to Tokyo across the Pacific", () => {
    expect(distanceKm([33.9416, -118.4085], [35.5494, 139.7798])).toBeCloseTo(8815, -2);
  });
});

describe("buildPath", () => {
  it("joins consecutive stops with a line from exit to entry", () => {
    const path = buildPath([makeItem(at(1, 1)), makeItem(at(2, 2))]);
    expect(path).toEqual([{ from: [1, 1], to: [2, 2], kind: "line" }]);
  });

  it("draws a flight as an arc and continues from its arrival", () => {
    const flight = makeItem({ type: "flight", ...at(1, 1), end_lat: 5, end_lng: 5 });
    const path = buildPath([makeItem(at(0, 0)), flight, makeItem(at(6, 6))]);
    expect(path).toEqual([
      { from: [0, 0], to: [1, 1], kind: "line" },
      { from: [1, 1], to: [5, 5], kind: "arc" },
      { from: [5, 5], to: [6, 6], kind: "line" },
    ]);
  });

  it("skips items without coordinates", () => {
    const path = buildPath([makeItem(at(0, 0)), makeItem(), makeItem(at(2, 2))]);
    expect(path).toEqual([{ from: [0, 0], to: [2, 2], kind: "line" }]);
  });

  it("returns nothing for fewer than two mappable stops", () => {
    expect(buildPath([])).toEqual([]);
    expect(buildPath([makeItem(at(1, 1))])).toEqual([]);
  });
});

describe("arcPoints", () => {
  it("starts at from, ends at to, and has segments + 1 points", () => {
    const pts = arcPoints([0, 0], [0, 10], 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[10]).toEqual([0, 10]);
  });

  it("bows away from the straight line", () => {
    const pts = arcPoints([0, 0], [0, 10], 10);
    expect(pts[5][0]).not.toBe(0);
  });
});

describe("buildPath with real routes", () => {
  it("draws a train's own leg as a line and continues from its last stop", () => {
    const train = makeItem({ type: "activity", ...at(35.68, 139.77), end_lat: 34.99, end_lng: 135.76 });
    const path = buildPath([makeItem(at(35.7, 139.8)), train, makeItem(at(35.0, 135.78))]);
    expect(path.map((s) => s.kind)).toEqual(["line", "line", "line"]);
    expect(path[1]).toEqual({ from: [35.68, 139.77], to: [34.99, 135.76], kind: "line" });
    expect(path[2].from).toEqual([34.99, 135.76]);
  });

  it("does not draw zero-length lines between stops at the same place", () => {
    expect(buildPath([makeItem(at(1, 1)), makeItem(at(1, 1)), makeItem(at(2, 2))])).toEqual([
      { from: [1, 1], to: [2, 2], kind: "line" },
    ]);
  });
});

describe("longitudeShift", () => {
  it("keeps a trip across the Pacific together", () => {
    const shift = longitudeShift([-118.4, 139.8, 135.2]);
    expect([-118.4, 139.8].map(shift)).toEqual([241.6, 139.8]);
  });

  it("leaves trips that do not cross the date line alone", () => {
    const shift = longitudeShift([-0.1, 2.35, -3.7]); // London, Paris, Madrid
    expect([-0.1, 2.35, -3.7].map(shift)).toEqual([-0.1, 2.35, -3.7]);
    expect(longitudeShift([])(10)).toBe(10);
  });
});

describe("mapStops (MAP-1, MAP-2)", () => {
  it("numbers mappable items in visit order and colors them by trip day", () => {
    const stops = mapStops(
      [
        makeItem({ id: "a", day: "2027-04-10", ...at(1, 1) }),
        makeItem({ id: "b", day: "2027-04-10" }),
        makeItem({ id: "c", day: "2027-04-12", ...at(2, 2), end_lat: 3, end_lng: 3 }),
      ],
      "2027-04-10",
    );
    expect(stops.map((s) => [s.item.id, s.number, s.color, s.dayIndex, s.end])).toEqual([
      ["a", 1, DAY_COLORS[0], 0, null],
      ["c", 2, DAY_COLORS[2], 2, [3, 3]],
    ]);
  });
});
