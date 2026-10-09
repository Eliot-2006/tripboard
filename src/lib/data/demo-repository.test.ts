import { describe, expect, it } from "vitest";
import { makeNewItem } from "@/test/factories";
import { createDemoRepository, DEMO_TRIP_ID } from "./demo-seed";
import { runRepositoryContract } from "./repository.contract";

runRepositoryContract("DemoRepository", () => createDemoRepository());

describe("DemoRepository", () => {
  it("starts with the seeded demo trip", async () => {
    const trip = await createDemoRepository().getTrip(DEMO_TRIP_ID);
    expect(trip?.name).toBe("Japan 2027");
  });

  it("never leaks mutations between instances", async () => {
    const a = createDemoRepository();
    const b = createDemoRepository();
    await a.deleteTrip(DEMO_TRIP_ID);
    expect(await a.getTrip(DEMO_TRIP_ID)).toBeNull();
    expect(await b.getTrip(DEMO_TRIP_ID)).not.toBeNull();
    expect((await b.getItems(DEMO_TRIP_ID)).length).toBeGreaterThan(0);
  });

  it("does not let callers mutate the store through returned objects", async () => {
    const repo = createDemoRepository();
    const [trip] = await repo.getTrips();
    trip.name = "hacked";
    const [item] = await repo.getItems(DEMO_TRIP_ID);
    item.metadata.airline = "hacked";
    expect((await repo.getTrips())[0].name).toBe("Japan 2027");
    expect((await repo.getItems(DEMO_TRIP_ID))[0].metadata.airline).toBe("ANA");
  });

  it("rejects items for a trip that does not exist", async () => {
    await expect(createDemoRepository().createItem(makeNewItem({ trip_id: "nope" }))).rejects.toThrow();
  });
});
