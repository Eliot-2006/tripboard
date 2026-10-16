import type { Trip } from "@/types";

/** Upcoming (soonest first) and past (most recent first) trips. A trip ending on `today` is still upcoming. */
export function splitTrips(trips: Trip[], today: string): { upcoming: Trip[]; past: Trip[] } {
  const byEnd = (a: Trip, b: Trip) => a.end_date.localeCompare(b.end_date) || a.start_date.localeCompare(b.start_date);
  const sorted = [...trips].sort(byEnd);
  return {
    upcoming: sorted.filter((t) => t.end_date >= today),
    past: sorted.filter((t) => t.end_date < today).reverse(),
  };
}
