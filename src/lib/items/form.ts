import { z } from "zod";
import { insertPositionByTime, sortItems } from "@/lib/ordering";
import { formatDay, isRealLocalTime, localToUtcIso, nextDay, resolveTimeZone, toLocalParts } from "@/lib/time";
import { BookingStatusSchema, ItemTypeSchema, PaymentStatusSchema } from "@/types/schemas";
import type { BookingStatus, Item, ItemType, NewItem, PaymentStatus, Trip } from "@/types";

/**
 * The item form works on strings, as HTML inputs do. `itemFormSchema` validates them with messages tied to
 * fields (UX-4), and `formToItem` turns valid values into an item. Times are entered as local date + clock time
 * in a time zone and stored as UTC (technical doc §6).
 */
export type ActivityCategory = "activity" | "restaurant";

export type ItemFormValues = {
  type: ItemType;
  title: string;
  /** "No exact time": only the day is saved (ITEM-5). */
  is_flexible: boolean;
  start_date: string;
  start_time: string;
  start_timezone: string;
  /** Flights and stays only. Activities end on their start date. */
  end_date: string;
  end_time: string;
  /** Flights only. Other types end in their start time zone. */
  end_timezone: string;
  start_location_name: string;
  start_address: string;
  start_lat: string;
  start_lng: string;
  /** Flights (arrival) and activities that end somewhere else, such as a train ride. */
  end_location_name: string;
  end_address: string;
  end_lat: string;
  end_lng: string;
  estimated_cost: string;
  actual_cost: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  confirmation_number: string;
  notes: string;
  airline: string;
  flight_number: string;
  category: ActivityCategory;
};

export const hasEndPlace = (type: ItemType) => type !== "stay";
export const hasEndDate = (type: ItemType) => type !== "activity";
export const hasEndTimeZone = (type: ItemType) => type === "flight";

/** A paid item is always reserved (ITEM-7). */
export function withPaymentRule(status: BookingStatus, payment: PaymentStatus): BookingStatus {
  return payment === "paid" ? "reserved" : status;
}

const blank = (s: string) => s.trim() === "";
const orNull = (s: string) => (blank(s) ? null : s.trim());
const parseNumber = (s: string) => (blank(s) ? null : Number(s.trim()));
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
// Plain decimals only: Number() would also accept "0x10" or "1e2".
const isDecimal = (s: string) => /^-?\d+(\.\d+)?$/.test(s.trim());

/**
 * The local date the item ends on. Flights and stays have an end date field. An activity ends on its start date,
 * or the next day when its end time is earlier than its start time (a late dinner or a night train).
 */
function endDateOf(v: ItemFormValues): string {
  if (hasEndDate(v.type)) return blank(v.end_date) ? v.start_date : v.end_date;
  return isTime(v.end_time) && isTime(v.start_time) && v.end_time < v.start_time ? nextDay(v.start_date) : v.start_date;
}

const endZoneInput = (v: ItemFormValues) => (hasEndTimeZone(v.type) ? v.end_timezone : v.start_timezone);
const zoneIssue = (input: string) => `We don't recognise “${input.trim()}”. Type a city like Tokyo, or pick from the list.`;

const END_LABEL: Record<ItemType, string> = { flight: "Arrival", stay: "Check-out", activity: "End" };
const START_LABEL: Record<ItemType, string> = { flight: "departure", stay: "check-in", activity: "start" };

const FormShape = z.object({
  type: ItemTypeSchema,
  title: z.string(),
  is_flexible: z.boolean(),
  start_date: z.string(),
  start_time: z.string(),
  start_timezone: z.string(),
  end_date: z.string(),
  end_time: z.string(),
  end_timezone: z.string(),
  start_location_name: z.string(),
  start_address: z.string(),
  start_lat: z.string(),
  start_lng: z.string(),
  end_location_name: z.string(),
  end_address: z.string(),
  end_lat: z.string(),
  end_lng: z.string(),
  estimated_cost: z.string(),
  actual_cost: z.string(),
  status: BookingStatusSchema,
  payment_status: PaymentStatusSchema,
  confirmation_number: z.string(),
  notes: z.string(),
  airline: z.string(),
  flight_number: z.string(),
  category: z.enum(["activity", "restaurant"]),
});

/** Validates form values for an item in `trip`. Every issue is reported on the field the user has to fix. */
export function itemFormSchema(trip: Pick<Trip, "start_date" | "end_date">) {
  return FormShape.superRefine((v, ctx) => {
    const issue = (path: keyof ItemFormValues, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (blank(v.title)) issue("title", "Enter a name");

    if (!isDate(v.start_date)) issue("start_date", "Pick a day");
    else if (v.start_date < trip.start_date || v.start_date > trip.end_date) {
      issue("start_date", `Pick a day between ${formatDay(trip.start_date)} and ${formatDay(trip.end_date)}`);
    }

    for (const field of ["estimated_cost", "actual_cost"] as const) {
      const raw = v[field].trim();
      if (raw === "") continue;
      // Checked as text: float math would reject amounts like 0.29. The database column is numeric(12,2).
      if (!isDecimal(raw)) issue(field, "Enter an amount, like 120 or 120.50");
      else if (raw.startsWith("-")) issue(field, "Cost cannot be negative");
      else if (!/^\d+(\.\d{1,2})?$/.test(raw)) issue(field, "Use at most 2 decimal places");
      else if (!/^\d{1,10}(\.|$)/.test(raw)) issue(field, "That amount is too large");
    }

    const places = hasEndPlace(v.type) ? (["start", "end"] as const) : (["start"] as const);
    for (const end of places) {
      const coord = (key: `${typeof end}_${"lat" | "lng"}`, other: string, name: string, max: number) => {
        const raw = v[key];
        if (blank(raw)) {
          if (!blank(other)) issue(key, `Enter the ${name.toLowerCase()} too, or clear the other coordinate`);
          return;
        }
        if (!isDecimal(raw)) issue(key, `Enter a number, like ${name === "Latitude" ? "35.7148" : "139.7967"}`);
        else if (Math.abs(Number(raw)) > max) issue(key, `${name} must be between -${max} and ${max}`);
      };
      coord(`${end}_lat`, v[`${end}_lng`], "Latitude", 90);
      coord(`${end}_lng`, v[`${end}_lat`], "Longitude", 180);
    }

    if (v.payment_status === "paid" && v.status !== "reserved") issue("status", "A paid item must be reserved");

    // Items with no exact time hide the zone field, so it is only checked for timed items. A flexible item keeps
    // its zone only if it resolves (see formToItem).
    if (v.is_flexible) return;
    const startZone = resolveTimeZone(v.start_timezone);
    if (!startZone) issue("start_timezone", zoneIssue(v.start_timezone));

    let startOk = startZone !== null && isDate(v.start_date);
    if (!isTime(v.start_time)) {
      issue("start_time", `Enter a ${START_LABEL[v.type]} time, or choose "No exact time"`);
      startOk = false;
    } else if (startOk && !isRealLocalTime(v.start_date, v.start_time, startZone!)) {
      issue("start_time", `${v.start_time} doesn't exist on ${formatDay(v.start_date)} in ${startZone} because the clocks change. Pick another time.`);
      startOk = false;
    }

    const endGiven = !blank(v.end_time) || (hasEndDate(v.type) && !blank(v.end_date));
    if (!endGiven) return;
    const endLabel = END_LABEL[v.type].toLowerCase();
    const endZone = resolveTimeZone(endZoneInput(v));
    let endOk = endZone !== null;
    if (hasEndTimeZone(v.type) && !endZone) issue("end_timezone", zoneIssue(v.end_timezone));
    if (hasEndDate(v.type) && !blank(v.end_date) && !isDate(v.end_date)) {
      issue("end_date", "Pick a day");
      endOk = false;
    }
    if (!isTime(v.end_time)) {
      issue("end_time", `Enter a ${endLabel} time, or clear the ${endLabel} date`);
      endOk = false;
    } else if (endOk && !isRealLocalTime(endDateOf(v), v.end_time, endZone!)) {
      issue("end_time", `${v.end_time} doesn't exist on ${formatDay(endDateOf(v))} in ${endZone} because the clocks change. Pick another time.`);
      endOk = false;
    }
    if (startOk && endOk) {
      const start = localToUtcIso(v.start_date, v.start_time, startZone!);
      const end = localToUtcIso(endDateOf(v), v.end_time, endZone!);
      if (Date.parse(end) < Date.parse(start)) {
        // Put the message on the field that is most likely wrong: an earlier date, otherwise the time.
        const field = hasEndDate(v.type) && !blank(v.end_date) && v.end_date < v.start_date ? "end_date" : "end_time";
        issue(field, `${END_LABEL[v.type]} cannot be before the ${START_LABEL[v.type]}`);
      }
    }
  });
}

/** Blank form for a new item on `day`, with times in `timezone`. */
export function emptyItemForm(type: ItemType, day: string, timezone: string): ItemFormValues {
  return {
    type,
    title: "",
    is_flexible: false,
    start_date: day,
    start_time: "",
    start_timezone: timezone,
    end_date: "",
    end_time: "",
    end_timezone: timezone,
    start_location_name: "",
    start_address: "",
    start_lat: "",
    start_lng: "",
    end_location_name: "",
    end_address: "",
    end_lat: "",
    end_lng: "",
    estimated_cost: "",
    actual_cost: "",
    status: "planned",
    payment_status: "unpaid",
    confirmation_number: "",
    notes: "",
    airline: "",
    flight_number: "",
    category: "activity",
  };
}

const text = (n: number | string | null | undefined) => (n === null || n === undefined ? "" : String(n));

/** Prefills the form from an existing item (ITEM-6). */
export function itemToForm(item: Item, fallbackTimeZone: string): ItemFormValues {
  // A timed item without a zone is shown in UTC (see formatItemTime), so edit it in UTC too, or saving it unchanged
  // would move it. `fallbackTimeZone` only seeds the field for items with no time.
  const startTz = item.start_timezone ?? (item.start_at ? "UTC" : fallbackTimeZone);
  const endTz = item.end_timezone ?? startTz;
  const start = item.start_at ? toLocalParts(item.start_at, startTz) : null;
  const end = item.end_at ? toLocalParts(item.end_at, endTz) : null;
  const meta = item.metadata;
  return {
    ...emptyItemForm(item.type, item.day, startTz),
    title: item.title,
    is_flexible: item.is_flexible || !item.start_at,
    start_date: item.day,
    start_time: start?.time ?? "",
    end_date: end && hasEndDate(item.type) ? end.date : "",
    end_time: end?.time ?? "",
    end_timezone: endTz,
    start_location_name: text(item.start_location_name),
    start_address: text(item.start_address),
    start_lat: text(item.start_lat),
    start_lng: text(item.start_lng),
    end_location_name: text(item.end_location_name),
    end_address: text(item.end_address),
    end_lat: text(item.end_lat),
    end_lng: text(item.end_lng),
    estimated_cost: text(item.estimated_cost),
    actual_cost: text(item.actual_cost),
    status: item.status,
    payment_status: item.payment_status,
    confirmation_number: text(item.confirmation_number),
    notes: text(item.notes),
    airline: typeof meta.airline === "string" ? meta.airline : "",
    flight_number: typeof meta.flight_number === "string" ? meta.flight_number : "",
    category: meta.category === "restaurant" ? "restaurant" : "activity",
  };
}

function metadataFor(v: ItemFormValues, base: Record<string, unknown>): Record<string, unknown> {
  // Keep extras the form does not edit (seat, room, ticket info) and set the ones it does.
  const meta = { ...base };
  const set = (key: string, value: string | null) => {
    if (value === null) delete meta[key];
    else meta[key] = value;
  };
  if (v.type === "flight") {
    set("airline", orNull(v.airline));
    set("flight_number", orNull(v.flight_number));
  }
  if (v.type === "activity") set("category", v.category);
  return meta;
}

/**
 * Turns validated form values into an item without a position (see `placeItem`).
 * `base` is the item being edited, so fields the form does not show are kept.
 */
export function formToItem(v: ItemFormValues, tripId: string, base?: Item): Omit<NewItem, "position"> {
  const timed = !v.is_flexible;
  const startTz = resolveTimeZone(v.start_timezone);
  const endTz = hasEndTimeZone(v.type) ? resolveTimeZone(v.end_timezone) : startTz;
  const end = timed && !blank(v.end_time);
  const endPlace = hasEndPlace(v.type);
  const title = v.title.trim();

  return {
    trip_id: tripId,
    type: v.type,
    title,
    notes: orNull(v.notes),
    day: v.start_date,
    is_flexible: v.is_flexible,
    start_at: timed ? localToUtcIso(v.start_date, v.start_time, startTz!) : null,
    end_at: end ? localToUtcIso(endDateOf(v), v.end_time, endTz!) : null,
    start_timezone: startTz,
    end_timezone: end ? endTz : null,
    // A stay is its own place, so its name doubles as the location name (ITEM-3).
    start_location_name: orNull(v.start_location_name) ?? (v.type === "stay" ? title : null),
    start_address: orNull(v.start_address),
    start_lat: parseNumber(v.start_lat),
    start_lng: parseNumber(v.start_lng),
    end_location_name: endPlace ? orNull(v.end_location_name) : null,
    end_address: endPlace ? orNull(v.end_address) : null,
    end_lat: endPlace ? parseNumber(v.end_lat) : null,
    end_lng: endPlace ? parseNumber(v.end_lng) : null,
    estimated_cost: parseNumber(v.estimated_cost),
    actual_cost: parseNumber(v.actual_cost),
    status: withPaymentRule(v.status, v.payment_status),
    payment_status: v.payment_status,
    confirmation_number: orNull(v.confirmation_number),
    metadata: metadataFor(v, base?.metadata ?? {}),
  };
}

/**
 * Position for a saved item. New items, and items moved to another day, go among that day's items by start time
 * (ITIN-10). An edit that stays on the same day keeps the order the user chose.
 */
export function placeItem(draft: Pick<NewItem, "day" | "start_at">, items: Item[], existing?: Item): number {
  if (existing && existing.day === draft.day) return existing.position;
  const dayItems = sortItems(items.filter((i) => i.day === draft.day && i.id !== existing?.id));
  return insertPositionByTime(dayItems, draft.start_at);
}

/**
 * Time zone for a new item on `day`: where the trip is by then, taken from the latest earlier item with a time zone
 * (a flight's arrival zone), else where the trip's first such item starts, else `fallback` (ITEM-11).
 */
export function defaultTimeZone(items: Item[], day: string, fallback: string): string {
  const zoned = sortItems(items).filter((i) => i.start_timezone);
  const before = zoned.filter((i) => i.day <= day).at(-1);
  if (before) return (before.end_timezone ?? before.start_timezone)!;
  return zoned[0]?.start_timezone ?? fallback;
}
