import type { NewItem } from "./index";

export const SEED_STAMP = "2026-01-01T00:00:00.000Z";

/** Every optional column null, booking planned, payment unpaid. Returns a fresh object each call. */
export function itemDefaults(): Omit<NewItem, "trip_id" | "type" | "title" | "day"> {
  return {
    notes: null,
    is_flexible: false,
    start_at: null,
    end_at: null,
    start_timezone: null,
    end_timezone: null,
    start_location_name: null,
    start_address: null,
    start_lat: null,
    start_lng: null,
    end_location_name: null,
    end_address: null,
    end_lat: null,
    end_lng: null,
    estimated_cost: null,
    actual_cost: null,
    status: "planned",
    payment_status: "unpaid",
    confirmation_number: null,
    position: 0,
    metadata: {},
  };
}
