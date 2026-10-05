import type { Item } from "@/types";

export const EPSILON = 1e-6;
const STEP = 1000;

export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return STEP;
  if (prev === null) return next! - STEP;
  if (next === null) return prev + STEP;
  return (prev + next) / 2;
}

export function needsRenumber(sortedPositions: number[]): boolean {
  return sortedPositions.some((p, i) => i > 0 && p - sortedPositions[i - 1] < EPSILON);
}

export function renumber<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position).map((it, i) => ({ ...it, position: (i + 1) * STEP }));
}

export function sortItems<T extends { day: string; position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position);
}

export function visibleItems(items: Item[], range: { start: string; end: string }): Item[] {
  return sortItems(items.filter((i) => i.day >= range.start && i.day <= range.end));
}

export function insertPositionByTime(dayItems: Item[], startAt: string | null): number {
  const last = dayItems.length ? dayItems[dayItems.length - 1].position : null;
  if (startAt === null) return positionBetween(last, null);
  const idx = dayItems.findIndex((i) => i.start_at !== null && Date.parse(i.start_at) > Date.parse(startAt));
  if (idx === -1) return positionBetween(last, null);
  return positionBetween(idx === 0 ? null : dayItems[idx - 1].position, dayItems[idx].position);
}
