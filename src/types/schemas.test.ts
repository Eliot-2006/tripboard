import { describe, expect, it } from "vitest";
import { makeItem, makeTrip } from "@/test/factories";
import { ItemSchema, NewTripSchema, TripSchema } from "@/types/schemas";

describe("ItemSchema", () => {
  it("accepts a default item", () => {
    expect(ItemSchema.safeParse(makeItem()).success).toBe(true);
  });

  it("rejects paid items that are not reserved", () => {
    const r = ItemSchema.safeParse(makeItem({ status: "planned", payment_status: "paid" }));
    expect(r.success).toBe(false);
  });

  it("accepts paid items that are reserved", () => {
    const r = ItemSchema.safeParse(makeItem({ status: "reserved", payment_status: "paid" }));
    expect(r.success).toBe(true);
  });

  it("rejects end_at before start_at", () => {
    const r = ItemSchema.safeParse(
      makeItem({ start_at: "2027-04-10T10:00:00.000Z", end_at: "2027-04-10T09:00:00.000Z" }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects negative costs", () => {
    expect(ItemSchema.safeParse(makeItem({ estimated_cost: -1 })).success).toBe(false);
  });

  it("rejects unknown item types", () => {
    expect(ItemSchema.safeParse({ ...makeItem(), type: "cruise" }).success).toBe(false);
  });
});

describe("TripSchema", () => {
  it("rejects an end date before the start date, on the end_date field", () => {
    const r = TripSchema.safeParse(makeTrip({ start_date: "2027-04-10", end_date: "2027-04-09" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["end_date"]);
  });

  it("validates create input without server-set fields", () => {
    const r = NewTripSchema.safeParse({
      name: "Japan",
      start_date: "2027-04-10",
      end_date: "2027-04-18",
      destinations: [],
      currency: "USD",
      total_budget: null,
    });
    expect(r.success).toBe(true);
  });
});
