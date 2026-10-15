import { localDay, shiftItemToDay } from "@/lib/time";
import type { Item } from "@/types";

const EPSILON = 1e-6;
const STEP = 1000;

export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return STEP;
  if (prev === null) return next! - STEP;
  if (next === null) return prev + STEP;
  return (prev + next) / 2;
}

export function sortItems<T extends { day: string; position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position);
}

export function visibleItems(items: Item[], range: { start: string; end: string }): Item[] {
  return sortItems(items.filter((i) => i.day >= range.start && i.day <= range.end));
}

/** Where an item starting at `startAt` goes among `dayItems`: before the first timed item that starts later, else last. */
function indexByTime(dayItems: Item[], startAt: string | null): number {
  const later = startAt === null ? -1 : dayItems.findIndex((i) => i.start_at !== null && Date.parse(i.start_at) > Date.parse(startAt));
  return later === -1 ? dayItems.length : later;
}

export function insertPositionByTime(dayItems: Item[], startAt: string | null): number {
  const at = indexByTime(dayItems, startAt);
  return positionBetween(at > 0 ? dayItems[at - 1].position : null, at < dayItems.length ? dayItems[at].position : null);
}

/** A move as saved: the item's new day and position, plus any neighbours renumbered to make room. */
export type Move = { id: string; day: string; position: number; renumber: { id: string; position: number }[] };

/**
 * Where an item lands when dropped at `index` among `dayItems` (the target day's items in order, without the item).
 * It takes the midpoint of its new neighbours so only one row changes. When that gap has collapsed, the whole day is
 * renumbered instead (technical doc §6).
 *
 * The renumbered rows are saved one by one, so a save that fails part way can leave the day out of order.
 * A database-backed repository should save a renumber in one transaction.
 */
export function planMove(id: string, day: string, dayItems: Item[], index: number): Move {
  const at = Math.max(0, Math.min(index, dayItems.length));
  const prev = at > 0 ? dayItems[at - 1].position : null;
  const next = at < dayItems.length ? dayItems[at].position : null;
  const position = positionBetween(prev, next);
  const cramped = (prev !== null && position - prev < EPSILON) || (next !== null && next - position < EPSILON);
  if (!cramped) return { id, day, position, renumber: [] };

  const order = [...dayItems.slice(0, at).map((i) => i.id), id, ...dayItems.slice(at).map((i) => i.id)];
  const fresh = new Map(order.map((itemId, i) => [itemId, (i + 1) * STEP]));
  return {
    id,
    day,
    position: fresh.get(id)!,
    renumber: dayItems.filter((i) => fresh.get(i.id) !== i.position).map((i) => ({ id: i.id, position: fresh.get(i.id)! })),
  };
}

/**
 * A "Move to day" menu move (ITIN-7): the item keeps its clock time and goes among that day's items by start time,
 * like a new item (ITIN-10), or last when it has no time.
 */
export function planMoveToDay(item: Item, day: string, items: Item[]): Move {
  const dayItems = sortItems(items.filter((i) => i.day === day && i.id !== item.id));
  const { start_at } = shiftItemToDay(item, day);
  return planMove(item.id, day, dayItems, indexByTime(dayItems, start_at));
}

/** The items as they will be after `move`, for showing it before the save finishes. */
export function applyMove(items: Item[], move: Move): Item[] {
  const renumbered = new Map(move.renumber.map((r) => [r.id, r.position]));
  return sortItems(
    items.map((i) => {
      if (i.id === move.id) return { ...i, day: move.day, position: move.position, ...shiftItemToDay(i, move.day) };
      const position = renumbered.get(i.id);
      return position === undefined ? i : { ...i, position };
    }),
  );
}

/**
 * Stays that cover each day without starting on it: the nights between check-in and check-out (ITIN-8).
 * They are derived from the stay, not stored, and use all items, so a stay that began before the visible range counts.
 */
export function stayContinuations(items: Item[], days: string[]): Record<string, Item[]> {
  const stays = sortItems(items.filter((i) => i.type === "stay" && i.end_at));
  return Object.fromEntries(
    days.map((day) => [
      day,
      stays.filter((s) => s.day < day && day < localDay(s.end_at!, s.end_timezone ?? s.start_timezone ?? "UTC")),
    ]),
  );
}
