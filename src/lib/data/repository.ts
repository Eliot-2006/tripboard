import type { Item, ItemPatch, NewItem, Trip } from "@/types";

export interface Repository {
  getTrip(id: string): Promise<Trip | null>;
  /** Ordered by day, then position. */
  getItems(tripId: string): Promise<Item[]>;
  createItem(input: NewItem): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<Item>;
  deleteItem(id: string): Promise<void>;
}
