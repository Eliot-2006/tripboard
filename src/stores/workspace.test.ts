import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspace } from "@/stores/workspace";

beforeEach(() => useWorkspace.getState().reset());

describe("workspace store", () => {
  it("starts with nothing selected and the whole trip", () => {
    expect(useWorkspace.getState()).toMatchObject({ selectedItemId: null, range: null });
  });

  it("selects and deselects an item", () => {
    useWorkspace.getState().select("a");
    expect(useWorkspace.getState().selectedItemId).toBe("a");
    useWorkspace.getState().select(null);
    expect(useWorkspace.getState().selectedItemId).toBeNull();
  });

  it("sets and clears the range", () => {
    useWorkspace.getState().setRange({ start: "2027-04-12", end: "2027-04-14" });
    expect(useWorkspace.getState().range).toEqual({ start: "2027-04-12", end: "2027-04-14" });
    useWorkspace.getState().setRange(null);
    expect(useWorkspace.getState().range).toBeNull();
  });

  it("swaps an inverted range instead of producing an empty view", () => {
    useWorkspace.getState().setRange({ start: "2027-04-14", end: "2027-04-12" });
    expect(useWorkspace.getState().range).toEqual({ start: "2027-04-12", end: "2027-04-14" });
  });

  it("reset clears everything", () => {
    useWorkspace.getState().select("a");
    useWorkspace.getState().setRange({ start: "2027-04-12", end: "2027-04-14" });
    useWorkspace.getState().reset();
    expect(useWorkspace.getState()).toMatchObject({ selectedItemId: null, range: null });
  });
});
