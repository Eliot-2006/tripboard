import { DateTime } from "luxon";
import type { Item } from "@/types";

function valid(dt: DateTime): DateTime {
  if (!dt.isValid) throw new Error(`Invalid date/time: ${dt.invalidExplanation}`);
  return dt;
}

const utc = (isoOrDay: string) => valid(DateTime.fromISO(isoOrDay, { zone: "utc" }));
const inZone = (iso: string, tz: string) => valid(utc(iso).setZone(tz));

export function localToUtcIso(day: string, time: string, tz: string): string {
  return valid(DateTime.fromISO(`${day}T${time}`, { zone: tz })).toUTC().toISO()!;
}

export function localDay(iso: string, tz: string): string {
  return inZone(iso, tz).toISODate()!;
}

export function formatTime(iso: string, tz: string): string {
  return inZone(iso, tz).toFormat("h:mm a");
}

export function formatDateTime(iso: string, tz: string): string {
  return inZone(iso, tz).toFormat("ccc, LLL d, h:mm a ZZZZ");
}

export function formatDay(day: string): string {
  return utc(day).toFormat("ccc, LLL d");
}

export function dayDiff(from: string, to: string): number {
  return Math.round(utc(to).diff(utc(from), "days").days);
}

export function shiftDays(iso: string, tz: string, days: number): string {
  return inZone(iso, tz).plus({ days }).toUTC().toISO()!;
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const last = utc(end).toMillis();
  for (let d = utc(start); d.toMillis() <= last; d = d.plus({ days: 1 })) {
    out.push(d.toISODate()!);
  }
  return out;
}

export function formatItemTime(item: Pick<Item, "is_flexible" | "start_at" | "start_timezone">): string {
  if (item.is_flexible || !item.start_at) return "Anytime";
  return formatTime(item.start_at, item.start_timezone ?? "UTC");
}

type Timed = Pick<Item, "is_flexible" | "start_at" | "end_at" | "start_timezone" | "end_timezone">;

/**
 * Times for an item moved to `day`: the clock time is kept and both ends shift by the same number of calendar days.
 * Flexible or untimed items have no times to shift.
 */
export function shiftItemToDay(item: Timed, day: string): { start_at: string | null; end_at: string | null } {
  if (item.is_flexible || !item.start_at) return { start_at: null, end_at: null };

  const startTz = item.start_timezone ?? "UTC";
  const delta = dayDiff(localDay(item.start_at, startTz), day);
  const start_at = shiftDays(item.start_at, startTz, delta);
  if (!item.end_at) return { start_at, end_at: null };

  let end_at = shiftDays(item.end_at, item.end_timezone ?? startTz, delta);
  // Zones with different DST rules, or a start in a DST gap, can invert a short item: keep its duration instead.
  if (Date.parse(end_at) < Date.parse(start_at)) {
    end_at = new Date(Date.parse(start_at) + (Date.parse(item.end_at) - Date.parse(item.start_at))).toISOString();
  }
  return { start_at, end_at };
}
