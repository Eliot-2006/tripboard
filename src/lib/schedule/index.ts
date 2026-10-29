import { distanceKm, endOf, startOf } from "@/lib/map/path";
import type { Item } from "@/types";

export type ScheduleNote = { kind: "overlap" | "tight" | "free"; text: string };

const FREE_MIN = 120; // a gap this long between timed items reads as free time
const IGNORE_TRAVEL_MIN = 5; // closer than this counts as the same place
const AIRPORT_BEFORE_MIN = 120; // be at the airport this long before a departure
const AIRPORT_AFTER_MIN = 60; // landing to leaving the airport
// ponytail: straight-line distance at a flat 30 km/h, no real routing, so intercity gaps and rivers or mountains
// are off. Upgrade path: a routing API (travel time per leg) behind this one function.
const SPEED_KMH = 30;

const timed = (i: Item) => !i.is_flexible && !!i.start_at && i.type !== "stay"; // stays are lodging windows, not appointments

function duration(min: number): string {
  const [h, m] = [Math.floor(min / 60), Math.round(min % 60)];
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Minutes to get from where `prev` leaves you to where `next` starts, plus airport time around flights. */
function needed(prev: Item, next: Item): number {
  const [from, to] = [endOf(prev) ?? startOf(prev), startOf(next)];
  const travel = from && to ? Math.ceil((distanceKm(from, to) / SPEED_KMH) * 60) : 0;
  return (travel >= IGNORE_TRAVEL_MIN ? travel : 0) + (prev.type === "flight" ? AIRPORT_AFTER_MIN : 0) + (next.type === "flight" ? AIRPORT_BEFORE_MIN : 0);
}

/**
 * Notes for one day's items in display order, keyed by the id of the later item of each pair, to show above it (PRD V3). Only
 * timed items are compared, on UTC instants because each carries its own zone. Per pair, one of: overlap (the next
 * starts before the previous ends), tight (the gap is shorter than the estimated travel), free (a gap of two hours or more).
 * A previous item without an end counts as ending when it starts, and the pair is skipped if the next one starts
 * even earlier (manual order, nothing to say). Without coordinates, only flight airport time is expected.
 */
export function scheduleNotes(dayItems: Item[]): Record<string, ScheduleNote> {
  const out: Record<string, ScheduleNote> = {};
  const list = dayItems.filter(timed);
  for (let n = 1; n < list.length; n++) {
    const [prev, next] = [list[n - 1], list[n]];
    const gap = (Date.parse(next.start_at!) - Date.parse(prev.end_at ?? prev.start_at!)) / 60000;
    if (gap < 0) {
      if (prev.end_at) out[next.id] = { kind: "overlap", text: `Overlap: starts ${duration(-gap)} before ${prev.title} ends` };
      continue;
    }
    const need = needed(prev, next);
    if (gap < need) {
      const airport = prev.type === "flight" || next.type === "flight" ? " with airport time" : "";
      out[next.id] = { kind: "tight", text: `Tight connection: ${duration(gap)} between, about ${duration(need)} needed${airport}` };
    } else if (gap >= FREE_MIN) {
      out[next.id] = { kind: "free", text: `Free time: ${duration(gap)}` };
    }
  }
  return out;
}
