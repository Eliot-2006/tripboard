import { describe, expect, it } from "vitest";
import { makeNewItem } from "@/test/factories";
import type { NewTrip } from "@/types";
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

export function runRepositoryContract(name: string, make: () => Promise<Repository> | Repository) {
  describe(`${name} satisfies the repository contract`, () => {
    async function setup() {
      const repo = await make();
      const trip = await repo.createTrip(newTrip());
      return { repo, trip };
    }

    it("creates and reads trips", async () => {
      const { repo, trip } = await setup();
      expect(await repo.getTrip(trip.id)).toEqual(trip);
      expect((await repo.getTrips()).map((t) => t.id)).toContain(trip.id);
    });

    it("returns null for an unknown trip", async () => {
      expect(await (await make()).getTrip("nope")).toBeNull();
    });

    it("rejects a trip that ends before it starts", async () => {
      const repo = await make();
      await expect(repo.createTrip(newTrip({ start_date: "2027-04-10", end_date: "2027-04-09" }))).rejects.toThrow();
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
      const repo = await make();
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
      const renamed = await repo.updateTrip(trip.id, { name: "Renamed", total_budget: undefined });
      expect(renamed.name).toBe("Renamed");
      expect(renamed.total_budget).toBeNull();
    });

    it("deleting a trip deletes its items", async () => {
      const { repo, trip } = await setup();
      await repo.createItem(makeNewItem({ trip_id: trip.id }));
      await repo.deleteTrip(trip.id);
      expect(await repo.getTrip(trip.id)).toBeNull();
      expect(await repo.getItems(trip.id)).toEqual([]);
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

    it("moveItem keeps a multi-day flight's arrival the same number of days after departure", async () => {
      const { repo, trip } = await setup();
      const flight = await repo.createItem(
        makeNewItem({
          trip_id: trip.id,
          type: "flight",
          day: "2027-04-10",
          start_at: "2027-04-10T18:30:00.000Z", // 11:30 PDT
          end_at: "2027-04-11T06:45:00.000Z", // 15:45 JST next day
          start_timezone: "America/Los_Angeles",
          end_timezone: "Asia/Tokyo",
        }),
      );
      const moved = await repo.moveItem(flight.id, "2027-04-12", 1000);
      expect(moved.start_at).toBe("2027-04-12T18:30:00.000Z");
      expect(moved.end_at).toBe("2027-04-13T06:45:00.000Z");
    });

    it("moveItem keeps a short cross-zone flight from arriving before it departs", async () => {
      const { repo, trip } = await setup();
      const flight = await repo.createItem(
        makeNewItem({
          trip_id: trip.id,
          type: "flight",
          day: "2027-06-10",
          start_at: "2027-06-10T17:00:00.000Z", // 10:00 PDT
          end_at: "2027-06-10T17:30:00.000Z", // 10:30 MST (Phoenix has no DST)
          start_timezone: "America/Los_Angeles",
          end_timezone: "America/Phoenix",
        }),
      );
      const moved = await repo.moveItem(flight.id, "2027-01-10", 1000);
      expect(moved.start_at).toBe("2027-01-10T18:00:00.000Z");
      expect(moved.end_at).toBe("2027-01-10T18:30:00.000Z");
    });

    it("moveItem keeps the duration when the start lands in a DST gap", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(
        makeNewItem({
          trip_id: trip.id,
          day: "2027-03-13",
          start_at: "2027-03-13T07:30:00.000Z", // 02:30 EST
          end_at: "2027-03-13T08:10:00.000Z", // 03:10 EST
          start_timezone: "America/New_York",
          end_timezone: "America/New_York",
        }),
      );
      const moved = await repo.moveItem(item.id, "2027-03-14", 1000); // 02:30 does not exist on Mar 14
      expect(Date.parse(moved.end_at!) - Date.parse(moved.start_at!)).toBe(40 * 60 * 1000);
    });

    it("moveItem leaves flexible items without times", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, is_flexible: true }));
      const moved = await repo.moveItem(item.id, "2027-04-14", 1000);
      expect(moved.day).toBe("2027-04-14");
      expect(moved.start_at).toBeNull();
      expect(moved.end_at).toBeNull();
    });
  });
}
