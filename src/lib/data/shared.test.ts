import { describe, expect, it } from "vitest";
import { toSharedTrip } from "./shared";

const payload = () => ({
  trip: { name: "Japan", start_date: "2027-04-10", end_date: "2027-04-12", destinations: ["Tokyo"], currency: "JPY" },
  items: [
    {
      id: "i1",
      type: "flight",
      title: "Flight to Tokyo",
      day: "2027-04-10",
      is_flexible: false,
      start_at: "2027-04-10T18:30:00+00:00",
      end_at: null,
      start_timezone: "Europe/London",
      end_timezone: null,
      start_location_name: "LHR",
      start_address: null,
      start_lat: 51.47,
      start_lng: -0.45,
      end_location_name: "HND",
      end_address: null,
      end_lat: 35.55,
      end_lng: 139.78,
      status: "reserved",
      position: 1000,
      metadata: { category: "restaurant", seat: "12A", flight_number: "BA5" } as Record<string, unknown>,
    },
  ],
});

describe("toSharedTrip", () => {
  it("returns null when there is no shared trip", () => {
    expect(toSharedTrip(null, "tok")).toBeNull();
  });

  it("builds a trip and items with every private field empty or defaulted", () => {
    const shared = toSharedTrip(payload(), "tok")!;
    expect(shared.trip).toMatchObject({ id: "tok", user_id: "", name: "Japan", total_budget: null, share_token: null });
    expect(shared.items[0]).toMatchObject({
      trip_id: "tok",
      title: "Flight to Tokyo",
      start_lat: 51.47,
      notes: null,
      estimated_cost: null,
      actual_cost: null,
      confirmation_number: null,
      payment_status: "unpaid",
    });
  });

  it("drops any field it is not meant to show, even if the database returned it", () => {
    const leaky = payload();
    Object.assign(leaky.trip, { user_id: "u1", share_token: "tok", total_budget: 5000, id: "real-id" });
    Object.assign(leaky.items[0], {
      notes: "SECRET",
      confirmation_number: "SECRET",
      actual_cost: 9,
      estimated_cost: 8,
      payment_status: "paid",
    });
    const shared = toSharedTrip(leaky, "tok")!;
    expect(shared.trip).toMatchObject({ id: "tok", user_id: "", total_budget: null, share_token: null });
    expect(JSON.stringify(shared)).not.toMatch(/SECRET|real-id|u1|5000/);
    expect(shared.items[0]).toMatchObject({
      notes: null,
      confirmation_number: null,
      actual_cost: null,
      estimated_cost: null,
      payment_status: "unpaid",
    });
  });

  it("keeps only the restaurant category from metadata", () => {
    expect(toSharedTrip(payload(), "tok")!.items[0].metadata).toEqual({ category: "restaurant" });
    const other = payload();
    other.items[0].metadata = { category: "activity", seat: "12A" };
    expect(toSharedTrip(other, "tok")!.items[0].metadata).toEqual({});
  });

  it("writes times as ISO strings in UTC", () => {
    expect(toSharedTrip(payload(), "tok")!.items[0].start_at).toBe("2027-04-10T18:30:00.000Z");
  });

  it("rejects a payload that is not a shared trip", () => {
    expect(() => toSharedTrip({ trip: {}, items: [] }, "tok")).toThrow();
  });
});
