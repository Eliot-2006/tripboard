import { describe, expect, it } from "vitest";
import { makeTrip } from "@/test/factories";
import { splitTrips } from "@/lib/trips/split";

const trip = (id: string, start_date: string, end_date: string) => makeTrip({ id, start_date, end_date });

describe("splitTrips", () => {
  const today = "2027-04-10";
  const trips = [
    trip("past-old", "2027-01-01", "2027-01-05"),
    trip("later", "2027-08-01", "2027-08-09"),
    trip("past-new", "2027-03-01", "2027-03-09"),
    trip("soon", "2027-05-01", "2027-05-04"),
  ];

  it("sorts upcoming soonest first and past most recent first", () => {
    const { upcoming, past } = splitTrips(trips, today);
    expect(upcoming.map((t) => t.id)).toEqual(["soon", "later"]);
    expect(past.map((t) => t.id)).toEqual(["past-new", "past-old"]);
  });

  it("keeps a trip ending today upcoming and one ending yesterday past", () => {
    const { upcoming, past } = splitTrips([trip("ends-today", "2027-04-08", today), trip("ended", "2027-04-05", "2027-04-09")], today);
    expect(upcoming.map((t) => t.id)).toEqual(["ends-today"]);
    expect(past.map((t) => t.id)).toEqual(["ended"]);
  });

  it("returns empty groups for no trips", () => {
    expect(splitTrips([], today)).toEqual({ upcoming: [], past: [] });
  });
});
