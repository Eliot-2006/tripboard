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

/** The local date and 24-hour clock time of `iso` in `tz`, as form inputs expect them. */
export function toLocalParts(iso: string, tz: string): { date: string; time: string } {
  const dt = inZone(iso, tz);
  return { date: dt.toISODate()!, time: dt.toFormat("HH:mm") };
}

/** False when `time` does not exist on `day` in `tz`, because the clocks jump forward over it. */
export function isRealLocalTime(day: string, time: string, tz: string): boolean {
  const dt = DateTime.fromISO(`${day}T${time}`, { zone: tz });
  return dt.isValid && dt.toFormat("yyyy-MM-dd'T'HH:mm") === `${day}T${time}`;
}

let zoneNames: string[] | undefined;
/** IANA zone names, plus UTC, which some browsers leave out. */
export function timeZoneNames(): string[] {
  zoneNames ??= [...new Set([...Intl.supportedValuesOf("timeZone"), "UTC"])];
  return zoneNames;
}

export const browserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const ZONE_ID = /^[A-Za-z][\w+-]*(\/[\w+-]+)*$/;
const cityKey = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, " ");
const cityOf = (zone: string) => zone.split("/").at(-1)!.replaceAll("_", " ");

/** The zone as this browser names it, if it is one of `timeZoneNames()`. Aliases resolve ("US/Pacific"). */
function listedZone(tz: string): string | null {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: tz }).resolvedOptions().timeZone;
    return timeZoneNames().includes(name) ? name : null;
  } catch {
    return null;
  }
}

/**
 * The IANA zone a person means: an id in any letter case ("asia/tokyo"), an alias ("US/Pacific") or a city
 * ("Los Angeles"). Returns the browser's own name for it, or null when nothing matches. Offsets and abbreviations
 * such as "+09:00" or "EST" are rejected: they are fixed offsets, while people typing them usually mean a place
 * that observes daylight saving.
 */
export function resolveTimeZone(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (ZONE_ID.test(text) && (text.includes("/") || /^(utc|gmt)$/i.test(text))) {
    const listed = listedZone(text);
    if (listed) return listed;
  }
  const key = cityKey(text);
  const names = timeZoneNames();
  const byCity = names.find((z) => cityKey(cityOf(z)) === key);
  if (byCity) return byCity;
  // Renamed cities: browsers list either Asia/Calcutta or Asia/Kolkata, but accept both. Try the city in each region.
  const city = key.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
  const regions = new Set(names.filter((z) => z.includes("/")).map((z) => z.split("/")[0]));
  for (const region of regions) {
    const listed = ZONE_ID.test(`${region}/${city}`) ? listedZone(`${region}/${city}`) : null;
    if (listed) return listed;
  }
  return null;
}

/** Suggestions for a time zone field: the id as the value, its city and current offset as the label. */
export function timeZoneOptions(): { value: string; label: string }[] {
  const now = DateTime.now();
  return timeZoneNames().map((z) => ({ value: z, label: `${cityOf(z)} · GMT${now.setZone(z).toFormat("Z")}` }));
}

export function nextDay(day: string): string {
  return utc(day).plus({ days: 1 }).toISODate()!;
}

export function localDay(iso: string, tz: string): string {
  return inZone(iso, tz).toISODate()!;
}

export function formatTime(iso: string, tz: string): string {
  return inZone(iso, tz).toFormat("h:mm a");
}

export function formatDateTime(iso: string, tz: string): string {
  // A GMT offset everywhere: abbreviations are only known for some zones (PDT, but GMT+9 for Tokyo).
  return inZone(iso, tz).toFormat("ccc, LLL d, h:mm a 'GMT'Z");
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

type CardTime = Pick<Item, "is_flexible" | "start_at" | "start_timezone"> &
  Partial<Pick<Item, "type" | "end_at" | "end_timezone">>;

/** The time on an item card. Flights also show the arrival, with "+1" or "−1" when it lands on another local day. */
export function formatItemTime(item: CardTime): string {
  if (item.is_flexible || !item.start_at) return "Anytime";
  const startTz = item.start_timezone ?? "UTC";
  const start = formatTime(item.start_at, startTz);
  if (item.type !== "flight" || !item.end_at) return start;
  const endTz = item.end_timezone ?? startTz;
  const days = dayDiff(localDay(item.start_at, startTz), localDay(item.end_at, endTz));
  // Crossing the date line can land a flight on an earlier local day, shown as "−1".
  const shift = days === 0 ? "" : ` ${days > 0 ? "+" : "−"}${Math.abs(days)}`;
  return `${start} → ${formatTime(item.end_at, endTz)}${shift}`;
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
