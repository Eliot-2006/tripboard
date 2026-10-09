import raw from "../../../supabase/seed/demo-trip.json";
import { itemDefaults, SEED_STAMP } from "@/types/defaults";
import { ItemSchema, TripSchema } from "@/types/schemas";
import type { Item, Trip } from "@/types";
import { DemoRepository } from "./demo-repository";

export const DEMO_TRIP_ID = "demo-trip";

/** Validates the sparse seed JSON against the schemas, filling omitted columns from itemDefaults(). */
export function loadDemoSeed(): { trips: Trip[]; items: Item[] } {
  return {
    trips: raw.trips.map((t) => TripSchema.parse(t)),
    items: raw.items.map((i) =>
      ItemSchema.parse({ ...itemDefaults(), created_at: SEED_STAMP, updated_at: SEED_STAMP, ...i }),
    ),
  };
}

export const createDemoRepository = (): DemoRepository => new DemoRepository(loadDemoSeed());
