import { describe, expect, it } from "vitest";
import { makeNewItem } from "@/test/factories";
import type { Trip } from "@/types";
import type { Repository } from "./repository";

/** `setup` returns a repository holding one trip with no items. */
export function runRepositoryContract(name: string, setup: () => Promise<{ repo: Repository; trip: Trip }>) {
  describe(`${name} satisfies the repository contract`, () => {
    it("reads a trip", async () => {
      const { repo, trip } = await setup();
      expect(await repo.getTrip(trip.id)).toEqual(trip);
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

    it("rejects updates for unknown items", async () => {
      const { repo } = await setup();
      await expect(repo.updateItem("nope", { title: "x" })).rejects.toThrow();
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

  });
}
