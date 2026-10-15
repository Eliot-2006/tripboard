import { z } from "zod";
import { isDate } from "@/lib/items/form";
import type { Item, NewTrip, Trip } from "@/types";

/**
 * The trip form works on strings, as HTML inputs do. `tripFormSchema` checks them with messages tied to fields (UX-4)
 * and `formToTrip` turns valid values into a trip (TRIP-2).
 */
export const tripFormSchema = z
  .object({
    name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    /** Comma-separated, e.g. "Tokyo, Kyoto". */
    destinations: z.string(),
    currency: z.string(),
    total_budget: z.string(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: keyof typeof v, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (!v.name.trim()) issue("name", "Give the trip a name");
    if (!isDate(v.start_date)) issue("start_date", "Pick the day the trip starts");
    if (!isDate(v.end_date)) issue("end_date", "Pick the day the trip ends");
    else if (isDate(v.start_date) && v.end_date < v.start_date) issue("end_date", "End date cannot be before start date");
    if (!/^[A-Za-z]{3}$/.test(v.currency.trim())) issue("currency", "Use a three-letter code, like USD or EUR");
    const budget = v.total_budget.trim().replaceAll(",", "");
    if (budget && !/^\d+(\.\d{1,2})?$/.test(budget)) issue("total_budget", "Enter an amount, like 3000 or 2500.50");
  });

export type TripFormValues = z.infer<typeof tripFormSchema>;

export const emptyTripForm = (): TripFormValues => ({
  name: "",
  start_date: "",
  end_date: "",
  destinations: "",
  currency: "USD",
  total_budget: "",
});

export const tripToForm = (trip: Trip): TripFormValues => ({
  name: trip.name,
  start_date: trip.start_date,
  end_date: trip.end_date,
  destinations: trip.destinations.join(", "),
  currency: trip.currency,
  total_budget: trip.total_budget === null ? "" : String(trip.total_budget),
});

export function formToTrip(v: TripFormValues): NewTrip {
  const budget = v.total_budget.trim().replaceAll(",", "");
  return {
    name: v.name.trim(),
    start_date: v.start_date,
    end_date: v.end_date,
    destinations: v.destinations.split(",").map((d) => d.trim()).filter(Boolean),
    currency: v.currency.trim().toUpperCase(),
    total_budget: budget ? Number(budget) : null,
  };
}

/** Items new dates would leave out, to warn before saving (TRIP-3). They are kept, and show again if the dates widen. */
export const itemsOutside = (items: Item[], start: string, end: string): Item[] =>
  items.filter((i) => i.day < start || i.day > end);
