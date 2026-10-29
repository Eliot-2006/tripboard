import { dayColor } from "@/lib/map/colors";
import { dayDiff } from "@/lib/time";
import type { Item } from "@/types";

export type LatLng = [number, number];
export type Segment = { from: LatLng; to: LatLng; kind: "line" | "arc" };

export const startOf = (i: Item): LatLng | null => (i.start_lat !== null && i.start_lng !== null ? [i.start_lat, i.start_lng] : null);
export const endOf = (i: Item): LatLng | null => (i.end_lat !== null && i.end_lng !== null ? [i.end_lat, i.end_lng] : null);
const same = (a: LatLng, b: LatLng) => a[0] === b[0] && a[1] === b[1];

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(((b[1] - a[1]) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The route through `items`, in visit order (MAP-3). Each item is entered at its start location and left from its
 * end location (a flight's arrival, a train's last stop), or from its start when it has no end. A line joins each
 * exit to the next entry, and an item that travels draws its own leg: an arc for flights, a line otherwise.
 * Items without coordinates are skipped.
 */
export function buildPath(items: Item[]): Segment[] {
  const out: Segment[] = [];
  let exit: LatLng | null = null;
  for (const item of items) {
    const entry = startOf(item);
    if (!entry) continue;
    if (exit && !same(exit, entry)) out.push({ from: exit, to: entry, kind: "line" });
    const end = endOf(item);
    if (end && !same(entry, end)) out.push({ from: entry, to: end, kind: item.type === "flight" ? "arc" : "line" });
    exit = end ?? entry;
  }
  return out;
}

/** Points along a quadratic curve from `from` to `to`, bowed sideways by a fifth of the distance, for flight arcs. */
export function arcPoints(from: LatLng, to: LatLng, segments = 24): LatLng[] {
  const [dLat, dLng] = [to[0] - from[0], to[1] - from[1]];
  // Control point: the midpoint pushed out perpendicular to the straight line.
  const control: LatLng = [(from[0] + to[0]) / 2 - dLng * 0.2, (from[1] + to[1]) / 2 + dLat * 0.2];
  const points: LatLng[] = [];
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const [a, b, c] = [(1 - t) ** 2, 2 * (1 - t) * t, t ** 2];
    points.push([a * from[0] + b * control[0] + c * to[0], a * from[1] + b * control[1] + c * to[1]]);
  }
  points[0] = from;
  points[segments] = to;
  return points;
}

/**
 * A trip across the Pacific (Los Angeles at -118°, Tokyo at 140°) looks like it circles the globe the other way when
 * longitudes are drawn as they are. Returns how to shift longitudes so the points sit close together: western ones
 * move by +360° when that makes their spread smaller. Leaflet draws longitudes past 180° on the next copy of the world.
 */
export function longitudeShift(longitudes: number[]): (lng: number) => number {
  if (longitudes.length === 0) return (lng) => lng;
  const spread = (lngs: number[]) => Math.max(...lngs) - Math.min(...lngs);
  const shifted = longitudes.map((l) => (l < 0 ? l + 360 : l));
  return spread(shifted) < spread(longitudes) ? (lng) => (lng < 0 ? lng + 360 : lng) : (lng) => lng;
}

/** A numbered pin on the map (MAP-1, MAP-2). Stays are one pin even across several days (MAP-9). */
export type Stop = { item: Item; number: number; color: string; dayIndex: number; at: LatLng; end: LatLng | null };

/** Pins for the visible items that have coordinates, numbered in visit order and colored by trip day. */
export function mapStops(items: Item[], tripStart: string): Stop[] {
  return items
    .filter((i) => startOf(i))
    .map((item, n) => {
      const dayIndex = dayDiff(tripStart, item.day);
      const end = endOf(item);
      return { item, number: n + 1, color: dayColor(dayIndex), dayIndex, at: startOf(item)!, end: end && !same(end, startOf(item)!) ? end : null };
    });
}
