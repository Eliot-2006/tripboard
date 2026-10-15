import { describe, expect, it } from "vitest";
import { makeNewItem } from "@/test/factories";
import type { NewTrip, Trip } from "@/types";
import type { Repository } from "./repository";

const newTrip = (over: Partial<NewTrip> = {}): NewTrip => ({
  name: "Contract trip",
  start_date: "2027-04-10",
  end_date: "2027-04-18",
  destinations: [],
  currency: "USD",
  total_budget: null,
  ...over,
});

/** `setup` returns a repository holding one trip with no items. */
export function runRepositoryContract(name: string, setup: () => Promise<{ repo: Repository; trip: Trip }>) {
  describe(`${name} satisfies the repository contract`, () => {
    it("reads a trip", async () => {
      const { repo, trip } = await setup();
      expect(await repo.getTrip(trip.id)).toEqual(trip);
    });

    it("creates, lists, updates and deletes trips", async () => {
      const { repo } = await setup();
      const trip = await repo.createTrip(newTrip({ destinations: ["Lisbon"], total_budget: 1200.5 }));
      expect(await repo.getTrip(trip.id)).toEqual(trip);
      expect((await repo.getTrips()).map((t) => t.id)).toContain(trip.id);

      const renamed = await repo.updateTrip(trip.id, { name: "Renamed", total_budget: undefined });
      expect(renamed.name).toBe("Renamed");
      expect(renamed.total_budget).toBe(1200.5);

      await repo.deleteTrip(trip.id);
      expect(await repo.getTrip(trip.id)).toBeNull();
    });

    it("rejects a trip that ends before it starts", async () => {
      const { repo } = await setup();
      await expect(repo.createTrip(newTrip({ start_date: "2027-04-10", end_date: "2027-04-09" }))).rejects.toThrow();
    });

    it("deleting a trip deletes its items", async () => {
      const { repo, trip } = await setup();
      await repo.createItem(makeNewItem({ trip_id: trip.id }));
      await repo.deleteTrip(trip.id);
      expect(await repo.getTrip(trip.id)).toBeNull();
      expect(await repo.getItems(trip.id)).toEqual([]);
    });

    it("returns null for an unknown trip", async () => {
      expect(await (await setup()).repo.getTrip("nope")).toBeNull();
    });

    it("creates, updates and deletes items", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, title: "Lunch" }));
      expect((await repo.getItems(trip.id)).map((i) => i.id)).toEqual([item.id]);

      const updated = await repo.updateItem(item.id, { title: "Dinner" });
      expect(updated.title).toBe("Dinner");

      await repo.deleteItem(item.id);
      expect(await repo.getItems(trip.id)).toEqual([]);
    });

    it("returns items ordered by day, then position", async () => {
      const { repo, trip } = await setup();
      const late = await repo.createItem(makeNewItem({ trip_id: trip.id, day: "2027-04-11", position: 1000 }));
      const second = await repo.createItem(makeNewItem({ trip_id: trip.id, day: "2027-04-10", position: 2000 }));
      const first = await repo.createItem(makeNewItem({ trip_id: trip.id, day: "2027-04-10", position: 1000 }));
      expect((await repo.getItems(trip.id)).map((i) => i.id)).toEqual([first.id, second.id, late.id]);
    });

    it("rejects an item that is paid but not reserved", async () => {
      const { repo, trip } = await setup();
      await expect(
        repo.createItem(makeNewItem({ trip_id: trip.id, status: "planned", payment_status: "paid" })),
      ).rejects.toThrow();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, status: "planned" }));
      await expect(repo.updateItem(item.id, { payment_status: "paid" })).rejects.toThrow();
    });

    it("rejects updates and moves for unknown items", async () => {
      const { repo } = await setup();
      await expect(repo.updateItem("nope", { title: "x" })).rejects.toThrow();
      await expect(repo.moveItem("nope", "2027-04-11", 1000)).rejects.toThrow();
    });

    it("rejects moving an item to a trip that does not exist", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id }));
      await expect(repo.updateItem(item.id, { trip_id: "nope" })).rejects.toThrow();
      expect((await repo.getItems(trip.id)).map((i) => i.id)).toEqual([item.id]);
    });

    it("leaves fields untouched when a patch sets them to undefined", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, notes: "Bring cash" }));
      const updated = await repo.updateItem(item.id, { title: "Dinner", notes: undefined });
      expect(updated.title).toBe("Dinner");
      expect(updated.notes).toBe("Bring cash");
    });

    it("moveItem changes day and position and keeps the local clock time", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(
        makeNewItem({
          trip_id: trip.id,
          day: "2027-04-12",
          start_at: "2027-04-12T00:00:00.000Z",
          end_at: "2027-04-12T02:00:00.000Z",
          start_timezone: "Asia/Tokyo",
          end_timezone: "Asia/Tokyo",
        }),
      );
      const moved = await repo.moveItem(item.id, "2027-04-13", 500);
      expect(moved.day).toBe("2027-04-13");
      expect(moved.position).toBe(500);
      expect(moved.start_at).toBe("2027-04-13T00:00:00.000Z");
      expect(moved.end_at).toBe("2027-04-13T02:00:00.000Z");
    });
  });
}
