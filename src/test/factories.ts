import { itemDefaults, SEED_STAMP } from "@/types/defaults";
import type { Item, NewItem, Trip } from "@/types";

export const makeTrip = (over: Partial<Trip> = {}): Trip => ({
  id: "t1",
  user_id: "u1",
  name: "Test trip",
  start_date: "2027-04-10",
  end_date: "2027-04-18",
  destinations: [],
  currency: "USD",
  total_budget: null,
  created_at: SEED_STAMP,
  updated_at: SEED_STAMP,
  ...over,
});

export const makeNewItem = (over: Partial<NewItem> = {}): NewItem => ({
  ...itemDefaults(),
  trip_id: "t1",
  type: "activity",
  title: "Item",
  day: "2027-04-10",
  ...over,
});

export const makeItem = (over: Partial<Item> = {}): Item => ({
  ...makeNewItem(),
  id: crypto.randomUUID(),
  created_at: SEED_STAMP,
  updated_at: SEED_STAMP,
  ...over,
});
