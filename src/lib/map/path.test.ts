import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import { arcPoints, buildPath } from "@/lib/map/path";

const at = (lat: number, lng: number) => ({ start_lat: lat, start_lng: lng });

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
