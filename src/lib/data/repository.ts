import type { Item, ItemPatch, NewItem, NewTrip, Trip } from "@/types";
import type { SharedTrip } from "./shared";

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
  /** Turns the read-only link on, or replaces it with a new one so the old link stops working. Returns the trip with its `share_token`. */
  enableSharing(tripId: string): Promise<Trip>;
  /** Turns the read-only link off. */
  revokeSharing(tripId: string): Promise<Trip>;
  /**
   * What a share link shows: the trip and its items without private fields. Null for an unknown or revoked token.
   * Works without signing in.
   */
  getSharedTrip(token: string): Promise<SharedTrip | null>;
}

/** Undefined patch keys mean "leave as is", matching how a database update treats omitted columns. */
export const defined = <T extends object>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
