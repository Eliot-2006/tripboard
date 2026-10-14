import { sortItems } from "@/lib/ordering";
import { ItemSchema, NewItemSchema } from "@/types/schemas";
import type { Item, ItemPatch, NewItem, Trip } from "@/types";
import type { Repository } from "./repository";

const now = () => new Date().toISOString();
// Undefined patch keys mean "leave as is", matching how a database update treats omitted columns.
const defined = <T extends object>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;

/** In-memory repository for /demo. Every read and write goes through a copy, so callers never share state with it. */
export class DemoRepository implements Repository {
  private trips: Trip[];
  private items: Item[];

  constructor(seed: { trips: Trip[]; items: Item[] }) {
    this.trips = structuredClone(seed.trips);
    this.items = structuredClone(seed.items);
  }

  private tripIndex(id: string): number {
    const i = this.trips.findIndex((t) => t.id === id);
    if (i === -1) throw new Error(`Trip not found: ${id}`);
    return i;
  }

  private itemIndex(id: string): number {
    const i = this.items.findIndex((x) => x.id === id);
    if (i === -1) throw new Error(`Item not found: ${id}`);
    return i;
  }

  async getTrip(id: string) {
    const trip = this.trips.find((t) => t.id === id);
    return trip ? structuredClone(trip) : null;
  }

  async getItems(tripId: string) {
    return structuredClone(sortItems(this.items.filter((x) => x.trip_id === tripId)));
  }

  async createItem(input: NewItem) {
    const data = NewItemSchema.parse(input);
    this.tripIndex(data.trip_id);
    const stamp = now();
    const item: Item = { ...data, id: crypto.randomUUID(), created_at: stamp, updated_at: stamp };
    this.items.push(item);
    return structuredClone(item);
  }

  async updateItem(id: string, patch: ItemPatch) {
    const i = this.itemIndex(id);
    const next = ItemSchema.parse({ ...this.items[i], ...defined(patch), updated_at: now() });
    this.tripIndex(next.trip_id);
    this.items[i] = next;
    return structuredClone(next);
  }

  async deleteItem(id: string) {
    this.items = this.items.filter((x) => x.id !== id);
  }
}
