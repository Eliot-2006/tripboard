import { z } from "zod";
import { itemDefaults } from "@/types/defaults";
import { BookingStatusSchema, ItemTypeSchema } from "@/types/schemas";
import type { Item, Trip } from "@/types";

/** A shared trip as the read-only page shows it: the usual types, with everything private empty or defaulted. */
export type SharedTrip = { trip: Trip; items: Item[] };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
// Postgres sends "2027-04-10T18:30:00+00:00"; the app uses ISO strings in UTC.
const instant = z.string().transform((v) => new Date(v).toISOString()).nullable();
const text = z.string().nullable();
const coordinate = z.number().nullable();

/**
 * The only fields a share link may show. It mirrors get_shared_trip() in the database, and zod drops every key not
 * listed, so a private column would stay out even if the function ever returned it.
 */
const SharedPayload = z.object({
  trip: z.object({
    name: z.string(),
    start_date: isoDate,
    end_date: isoDate,
    destinations: z.array(z.string()),
    currency: z.string(),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      type: ItemTypeSchema,
      title: z.string(),
      day: isoDate,
      is_flexible: z.boolean(),
      start_at: instant,
      end_at: instant,
      start_timezone: text,
      end_timezone: text,
      start_location_name: text,
      start_address: text,
      start_lat: coordinate,
      start_lng: coordinate,
      end_location_name: text,
      end_address: text,
      end_lat: coordinate,
      end_lng: coordinate,
      status: BookingStatusSchema,
      position: z.number(),
      // The page reads one metadata key: the restaurant category (labels.ts). Nothing else gets through.
      metadata: z.record(z.string(), z.unknown()).transform((m) => (m.category === "restaurant" ? { category: "restaurant" } : {})),
    }),
  ),
});

const UNKNOWN_TIME = new Date(0).toISOString();

/**
 * Turns what a share link returns (or, for the demo, a trip and its items) into a trip the workspace can show. Null
 * for no trip. The link's token stands in for the ids the visitor must not learn: the trip's own id and its owner.
 */
export function toSharedTrip(payload: unknown, token: string): SharedTrip | null {
  if (payload == null) return null;
  const { trip, items } = SharedPayload.parse(payload);
  return {
    trip: {
      ...trip,
      id: token,
      user_id: "",
      total_budget: null,
      share_token: null,
      created_at: UNKNOWN_TIME,
      updated_at: UNKNOWN_TIME,
    },
    items: items.map((item) => ({
      ...itemDefaults(),
      ...item,
      trip_id: token,
      created_at: UNKNOWN_TIME,
      updated_at: UNKNOWN_TIME,
    })),
  };
}
