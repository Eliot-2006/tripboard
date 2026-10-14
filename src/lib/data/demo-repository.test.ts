import { describe, expect, it } from "vitest";
import { makeNewItem, makeTrip } from "@/test/factories";
import { DemoRepository } from "./demo-repository";
import { createDemoRepository, DEMO_TRIP_ID } from "./demo-seed";
import { runRepositoryContract } from "./repository.contract";

runRepositoryContract("DemoRepository", async () => {
  const trip = makeTrip();
  return { repo: new DemoRepository({ trips: [trip], items: [] }), trip };
});

describe("DemoRepository", () => {
  it("starts with the seeded demo trip", async () => {
    const trip = await createDemoRepository().getTrip(DEMO_TRIP_ID);
    expect(trip?.name).toBe("Japan 2027");
  });

  it("never leaks mutations between instances", async () => {
    const a = createDemoRepository();
    const b = createDemoRepository();
    const [item] = await a.getItems(DEMO_TRIP_ID);
    await a.deleteItem(item.id);
    expect((await a.getItems(DEMO_TRIP_ID)).map((i) => i.id)).not.toContain(item.id);
    expect((await b.getItems(DEMO_TRIP_ID)).map((i) => i.id)).toContain(item.id);
  });

  it("does not let callers mutate the store through returned objects", async () => {
    const repo = createDemoRepository();
    const trip = (await repo.getTrip(DEMO_TRIP_ID))!;
    trip.name = "hacked";
    const [item] = await repo.getItems(DEMO_TRIP_ID);
    item.metadata.airline = "hacked";
    expect((await repo.getTrip(DEMO_TRIP_ID))?.name).toBe("Japan 2027");
    expect((await repo.getItems(DEMO_TRIP_ID))[0].metadata.airline).toBe("ANA");
  });

  it("rejects items for a trip that does not exist", async () => {
    await expect(createDemoRepository().createItem(makeNewItem({ trip_id: "nope" }))).rejects.toThrow();
  });
});
