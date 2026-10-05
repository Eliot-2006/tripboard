import type { Item, ItemPatch, NewItem, NewTrip, Trip } from "@/types";

export interface Repository {
  getTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | null>;
  createTrip(input: NewTrip): Promise<Trip>;
  updateTrip(id: string, patch: Partial<NewTrip>): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;
  /** Ordered by day, then position. */
  getItems(tripId: string): Promise<Item[]>;
  createItem(input: NewItem): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<Item>;
  deleteItem(id: string): Promise<void>;
  /** Sets day and position. Timed items keep their local clock time on the new day. */
  moveItem(id: string, day: string, position: number): Promise<Item>;
}
