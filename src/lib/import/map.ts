import { emptyItemForm, type ItemFormValues } from "@/lib/items/form";
import { resolveTimeZone } from "@/lib/time";
import type { Draft } from "./schema";

/** Most drafts one document can produce, and the longest text kept per field. Anything beyond is dropped. */
export const MAX_DRAFTS = 10;
const MAX_TEXT = 500;
const MAX_NOTES = 2000;

const text = (s: string | null | undefined, max = MAX_TEXT) => (s ?? "").trim().slice(0, max);
const date = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : "");
const time = (s: string | null) => {
  const m = s?.trim().match(/^(\d{1,2}):(\d{2})/);
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};
const zone = (s: string | null) => (s ? (resolveTimeZone(s) ?? "") : "");

/**
 * A draft as item form values, so the review screen can edit it in the normal item form and it is saved through the
 * same `formToItem` path as any other item. Nothing is guessed: a missing time makes the item "No exact time", a
 * missing or unknown zone is left blank for `fillZones` or the user, and a price in another currency goes into the
 * notes instead of the trip's budget.
 */
export function draftToForm(d: Draft, trip: { currency: string }): ItemFormValues {
  const startZone = zone(d.start_timezone);
  const sameCurrency = !d.currency || d.currency.trim().toUpperCase() === trip.currency.toUpperCase();
  const foreignPrice = d.cost !== null && !sameCurrency ? `Price: ${d.cost} ${text(d.currency, 3).toUpperCase()}` : "";
  const startTime = time(d.start_time);
  const hasEnd = d.type !== "activity" ? date(d.end_date) !== "" || time(d.end_time) !== "" : time(d.end_time) !== "";

  return {
    ...emptyItemForm(d.type, date(d.start_date), startZone),
    title: text(d.title),
    is_flexible: startTime === "",
    start_time: startTime,
    end_date: d.type === "activity" ? "" : date(d.end_date),
    end_time: hasEnd ? time(d.end_time) : "",
    end_timezone: d.type === "flight" ? zone(d.end_timezone) || startZone : startZone,
    start_location_name: text(d.start_place),
    start_address: text(d.address),
    end_location_name: d.type === "stay" ? "" : text(d.end_place),
    estimated_cost: d.cost !== null && sameCurrency && d.cost >= 0 ? String(d.cost) : "",
    confirmation_number: text(d.confirmation_number, 64),
    notes: [text(d.notes, MAX_NOTES), foreignPrice].filter(Boolean).join("\n"),
    airline: d.type === "flight" ? text(d.airline) : "",
    flight_number: d.type === "flight" ? text(d.flight_number, 16) : "",
  };
}

export const draftsToForms = (drafts: Draft[], trip: { currency: string }): ItemFormValues[] =>
  drafts.slice(0, MAX_DRAFTS).map((d) => draftToForm(d, trip));

/** Fills the time zones the document did not give, so a draft with a time is complete. */
export function fillZones(v: ItemFormValues, fallback: string): ItemFormValues {
  const start = v.start_timezone || fallback;
  return { ...v, start_timezone: start, end_timezone: v.end_timezone || start };
}
