import type { SupabaseClient } from "@supabase/supabase-js";
import { shiftItemToDay } from "@/lib/time";
import { ItemSchema, NewItemSchema, NewTripSchema, TripSchema } from "@/types/schemas";
import type { Item, ItemPatch, NewItem, NewTrip, Trip } from "@/types";
import { defined, type Repository } from "./repository";
import { toSharedTrip } from "./shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres sends timestamps as "2027-04-10T18:30:00+00:00". The app compares and formats them as ISO strings in UTC.
const iso = (value: string | null) => (value === null ? null : new Date(value).toISOString());

type Row = Record<string, unknown>;

const toTrip = (row: Row): Trip =>
  TripSchema.parse({ ...row, created_at: iso(row.created_at as string), updated_at: iso(row.updated_at as string) });

const toItem = (row: Row): Item =>
  ItemSchema.parse({
    ...row,
    start_at: iso(row.start_at as string | null),
    end_at: iso(row.end_at as string | null),
    created_at: iso(row.created_at as string),
    updated_at: iso(row.updated_at as string),
  });

/** Throws the error a query returned, so callers see failures (and TanStack Query can show them) instead of empty data. */
function must<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

/**
 * Data for signed-in users. Row Level Security limits every query to the user's own trips and their items, so nothing
 * here filters by user. Writes are checked against the same schemas as the demo before they are sent.
 */
export class SupabaseRepository implements Repository {
  constructor(private db: SupabaseClient) {}

  async getTrips() {
    return must(await this.db.from("trips").select().order("start_date")).map(toTrip);
  }

  async getTrip(id: string) {
    if (!UUID.test(id)) return null;
    const row = must(await this.db.from("trips").select().eq("id", id).maybeSingle());
    return row ? toTrip(row) : null;
  }

  async createTrip(input: NewTrip) {
    const data = NewTripSchema.parse(input);
    return toTrip(must(await this.db.from("trips").insert(data).select().single()));
  }

  async updateTrip(id: string, patch: Partial<NewTrip>) {
    const current = await this.getTrip(id);
    if (!current) throw new Error(`Trip not found: ${id}`);
    const changes = defined(patch);
    TripSchema.parse({ ...current, ...changes });
    return toTrip(must(await this.db.from("trips").update(changes).eq("id", id).select().single()));
  }

  async deleteTrip(id: string) {
    must(await this.db.from("trips").delete().eq("id", id));
  }

  async getItems(tripId: string) {
    if (!UUID.test(tripId)) return [];
    const rows = must(await this.db.from("itinerary_items").select().eq("trip_id", tripId).order("day").order("position"));
    return rows.map(toItem);
  }

  async createItem(input: NewItem) {
    const data = NewItemSchema.parse(input);
    return toItem(must(await this.db.from("itinerary_items").insert(data).select().single()));
  }

  async updateItem(id: string, patch: ItemPatch) {
    const current = await this.getItem(id);
    const changes = defined(patch);
    ItemSchema.parse({ ...current, ...changes });
    return toItem(must(await this.db.from("itinerary_items").update(changes).eq("id", id).select().single()));
  }

  async deleteItem(id: string) {
    must(await this.db.from("itinerary_items").delete().eq("id", id));
  }

  async moveItem(id: string, day: string, position: number) {
    const item = await this.getItem(id);
    return this.updateItem(id, { day, position, ...shiftItemToDay(item, day) });
  }

  // The database replaces whatever is written to share_token with a token it generates, so these only say "new" or "none".
  async enableSharing(tripId: string) {
    return this.setShareToken(tripId, crypto.randomUUID());
  }

  async revokeSharing(tripId: string) {
    return this.setShareToken(tripId, null);
  }

  async getSharedTrip(token: string) {
    if (!UUID.test(token)) return null;
    return toSharedTrip(must(await this.db.rpc("get_shared_trip", { p_token: token })), token);
  }

  private async setShareToken(tripId: string, share_token: string | null) {
    if (!UUID.test(tripId)) throw new Error(`Trip not found: ${tripId}`);
    return toTrip(must(await this.db.from("trips").update({ share_token }).eq("id", tripId).select().single()));
  }

  private async getItem(id: string) {
    const row = UUID.test(id) ? must(await this.db.from("itinerary_items").select().eq("id", id).maybeSingle()) : null;
    if (!row) throw new Error(`Item not found: ${id}`);
    return toItem(row);
  }
}
