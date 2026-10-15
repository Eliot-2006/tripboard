import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createDemoRepository, DEMO_TRIP_ID } from "./demo-seed";
import { moveItemOptions } from "./hooks";
import type { Repository } from "./repository";

const key = ["items", DEMO_TRIP_ID];

async function setup(repo: Repository, events = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(key, await repo.getItems(DEMO_TRIP_ID));
  const observer = new MutationObserver(qc, moveItemOptions(repo, qc, DEMO_TRIP_ID, events));
  return { qc, observer };
}

const move = { id: "demo-sensoji", day: "2027-04-16", position: 1000, renumber: [] };

describe("moveItemOptions (ITIN-6)", () => {
  it("shows the move before the save finishes, then keeps it", async () => {
    const repo = createDemoRepository();
    const { observer } = await setup(repo);
    // A save that never finishes, so what is shown can only come from the optimistic update.
    const slow: Repository = Object.assign(Object.create(repo), { moveItem: () => new Promise(() => {}) });
    const pending = await setup(slow);
    void pending.observer.mutate(move);
    await vi.waitFor(() => {
      const shown = pending.qc.getQueryData<{ id: string; day: string }[]>(key)!;
      expect(shown.find((i) => i.id === "demo-sensoji")?.day).toBe("2027-04-16");
    });

    await observer.mutate(move);
    expect((await repo.getItems(DEMO_TRIP_ID)).find((i) => i.id === "demo-sensoji")?.day).toBe("2027-04-16");
  });

  it("puts the item back when the save fails", async () => {
    const repo = createDemoRepository();
    const failing: Repository = Object.assign(Object.create(repo), { moveItem: () => Promise.reject(new Error("offline")) });
    const { qc, observer } = await setup(failing);
    await expect(observer.mutate(move)).rejects.toThrow("offline");
    const items = qc.getQueryData<{ id: string; day: string }[]>(key)!;
    expect(items.find((i) => i.id === "demo-sensoji")?.day).toBe("2027-04-12");
  });
});

describe("overlapping moves", () => {
  it("reports a failed move even while a later one is still saving", async () => {
    const repo = createDemoRepository();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const failing: Repository = Object.assign(Object.create(repo), {
      moveItem: (id: string, day: string, position: number) =>
        id === "demo-sensoji" ? Promise.reject(new Error("offline")) : gate.then(() => repo.moveItem(id, day, position)),
    });
    const failed: string[] = [];
    const { qc } = await setup(failing);
    const options = moveItemOptions(failing, qc, DEMO_TRIP_ID, { onFailed: (m) => failed.push(m.id) });
    const second = new MutationObserver(qc, options);
    const first = new MutationObserver(qc, options);
    const later = second.mutate({ id: "demo-teamlab", day: "2027-04-16", position: 1000, renumber: [] });
    await vi.waitFor(() => expect(qc.isMutating()).toBe(1));
    await expect(first.mutate(move)).rejects.toThrow("offline");
    expect(failed).toEqual(["demo-sensoji"]);
    // The later move is still shown while it saves.
    expect(qc.getQueryData<{ id: string; day: string }[]>(key)!.find((i) => i.id === "demo-teamlab")?.day).toBe("2027-04-16");
    release();
    await later;
  });

  it("does not undo a later move that already saved when an earlier one fails", async () => {
    const repo = createDemoRepository();
    let fail!: () => void;
    const failLater = new Promise<void>((_, reject) => (fail = () => reject(new Error("offline"))));
    const flaky: Repository = Object.assign(Object.create(repo), {
      moveItem: (id: string, day: string, position: number) =>
        id === "demo-sensoji" ? failLater.then(() => repo.moveItem(id, day, position)) : repo.moveItem(id, day, position),
    });
    const { qc } = await setup(flaky);
    const options = moveItemOptions(flaky, qc, DEMO_TRIP_ID);
    const earlier = new MutationObserver(qc, options).mutate(move);
    await vi.waitFor(() => expect(qc.isMutating()).toBe(1));
    await new MutationObserver(qc, options).mutate({ id: "demo-teamlab", day: "2027-04-16", position: 1000, renumber: [] });
    fail();
    await expect(earlier).rejects.toThrow("offline");
    const shown = qc.getQueryData<{ id: string; day: string }[]>(key)!;
    expect(shown.find((i) => i.id === "demo-teamlab")?.day).toBe("2027-04-16");
  });
});
