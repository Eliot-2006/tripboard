import type { ItemFormValues } from "@/lib/items/form";
import type { Item } from "@/types";

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const metaText = (item: Item, key: string) => (typeof item.metadata[key] === "string" ? (item.metadata[key] as string) : "");

/**
 * The existing item a draft most likely repeats, or null. Rules, in order:
 * 1. Same type and the same confirmation number (ignoring case, spaces and dashes).
 * 2. Same type and day, and the same route or place: a flight with the same flight number or the same from and to; a
 *    stay or activity with the same place or name.
 * Same type is required in both: one package booking number may legitimately cover a flight and a hotel.
 */
export function findDuplicate(draft: ItemFormValues, existing: Item[]): Item | null {
  const code = norm(draft.confirmation_number);
  if (code) {
    const byCode = existing.find((i) => i.type === draft.type && norm(i.confirmation_number) === code);
    if (byCode) return byCode;
  }
  const sameDay = existing.filter((i) => i.type === draft.type && i.day === draft.start_date);
  if (draft.type === "flight") {
    const number = norm(draft.flight_number);
    const [from, to] = [norm(draft.start_location_name), norm(draft.end_location_name)];
    return (
      sameDay.find(
        (i) =>
          (number && norm(metaText(i, "flight_number")) === number) ||
          (from && to && norm(i.start_location_name) === from && norm(i.end_location_name) === to),
      ) ?? null
    );
  }
  const names = [norm(draft.title), norm(draft.start_location_name)].filter(Boolean);
  return sameDay.find((i) => names.some((n) => n === norm(i.title) || n === norm(i.start_location_name))) ?? null;
}
