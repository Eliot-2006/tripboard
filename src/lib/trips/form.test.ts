import { describe, expect, it } from "vitest";
import { makeItem, makeTrip } from "@/test/factories";
import { emptyTripForm, formToTrip, itemsOutside, tripFormSchema, tripToForm, type TripFormValues } from "./form";

const valid: TripFormValues = {
  name: " Japan 2027 ",
  start_date: "2027-04-10",
  end_date: "2027-04-18",
  destinations: "Tokyo, , Kyoto ",
  currency: "jpy",
  total_budget: "3,000.50",
};

const errors = (v: TripFormValues) => {
  const r = tripFormSchema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

describe("trip form (TRIP-2, UX-4)", () => {
  it("turns valid fields into a trip", () => {
    expect(errors(valid)).toEqual({});
    expect(formToTrip(valid)).toEqual({
      name: "Japan 2027",
      start_date: "2027-04-10",
      end_date: "2027-04-18",
      destinations: ["Tokyo", "Kyoto"],
      currency: "JPY",
      total_budget: 3000.5,
    });
  });

  it("leaves the budget empty when none is given", () => {
    expect(formToTrip({ ...valid, total_budget: " " }).total_budget).toBeNull();
  });

  it("explains each problem next to its field", () => {
    expect(errors(emptyTripForm())).toEqual({
      name: "Give the trip a name",
      start_date: "Pick the day the trip starts",
      end_date: "Pick the day the trip ends",
    });
    expect(errors({ ...valid, end_date: "2027-04-09", currency: "US$", total_budget: "-5" })).toEqual({
      end_date: "End date cannot be before start date",
      currency: "Use a three-letter code, like USD or EUR",
      total_budget: "Enter an amount, like 3000 or 2500.50",
    });
  });

  it("round-trips a saved trip", () => {
    const trip = makeTrip({ destinations: ["Lisbon", "Porto"], total_budget: 1200 });
    expect(formToTrip(tripToForm(trip))).toEqual({
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      destinations: ["Lisbon", "Porto"],
      currency: "USD",
      total_budget: 1200,
    });
  });
});

describe("itemsOutside (TRIP-3)", () => {
  it("finds the items new dates would leave out", () => {
    const items = ["2027-04-10", "2027-04-12", "2027-04-18"].map((day) => makeItem({ id: day, day }));
    expect(itemsOutside(items, "2027-04-11", "2027-04-17").map((i) => i.id)).toEqual(["2027-04-10", "2027-04-18"]);
    expect(itemsOutside(items, "2027-04-10", "2027-04-18")).toEqual([]);
  });
});
