import type { Item } from "@/types";

export type LatLng = [number, number];
export type Segment = { from: LatLng; to: LatLng; kind: "line" | "arc" };

/** Items in visit order. See the plan's Task 6 contract. Implemented in milestone M4. */
export function buildPath(items: Item[]): Segment[] {
  void items;
  throw new Error("not implemented: buildPath (M4, MAP-3)");
}

/** Quadratic arc between two points. Implemented in milestone M4. */
export function arcPoints(from: LatLng, to: LatLng, segments = 24): LatLng[] {
  void from;
  void to;
  void segments;
  throw new Error("not implemented: arcPoints (M4, MAP-3)");
}
