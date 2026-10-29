import { describe, expect, it } from "vitest";
import { emptyItemForm, type ItemFormValues } from "@/lib/items/form";
import { makeItem } from "@/test/factories";
import { findDuplicate } from "./duplicates";

const form = (over: Partial<ItemFormValues>): ItemFormValues => ({ ...emptyItemForm("flight", "2027-04-10", "UTC"), ...over });

const flight = makeItem({
  id: "f1",
  type: "flight",
  title: "LAX to Tokyo",
  day: "2027-04-10",
  confirmation_number: "ABC123",
  start_location_name: "LAX",
  end_location_name: "HND",
  metadata: { flight_number: "NH 105" },
});
const hotel = makeItem({ id: "h1", type: "stay", title: "Hotel Gracery", day: "2027-04-11", start_location_name: "Hotel Gracery" });
const existing = [flight, hotel];

describe("findDuplicate", () => {
  it("matches on confirmation number, ignoring case, spaces and dashes, even on another day", () => {
    expect(findDuplicate(form({ confirmation_number: "abc-123", start_date: "2027-05-01" }), existing)).toBe(flight);
    expect(findDuplicate(form({ confirmation_number: "ABC 123" }), existing)).toBe(flight);
  });

  it("does not match a confirmation number across types", () => {
    expect(findDuplicate(form({ type: "stay", confirmation_number: "ABC123", title: "Other", start_date: "2027-04-20" }), existing)).toBeNull();
  });

  it("matches the same flight number on the same day", () => {
    expect(findDuplicate(form({ flight_number: "nh105" }), existing)).toBe(flight);
  });

  it("matches the same route on the same day", () => {
    expect(findDuplicate(form({ start_location_name: "lax", end_location_name: "hnd" }), existing)).toBe(flight);
  });

  it("does not match the same flight number on another day", () => {
    expect(findDuplicate(form({ flight_number: "NH105", start_date: "2027-04-11" }), existing)).toBeNull();
  });

  it("does not match a different route or flight on the same day", () => {
    expect(findDuplicate(form({ flight_number: "NH106", start_location_name: "HND", end_location_name: "LAX" }), existing)).toBeNull();
    expect(findDuplicate(form({ start_location_name: "LAX" }), existing)).toBeNull();
  });

  it("matches a stay by name or place on the same day", () => {
    expect(findDuplicate(form({ type: "stay", title: "hotel gracery", start_date: "2027-04-11" }), existing)).toBe(hotel);
    expect(findDuplicate(form({ type: "stay", title: "Booking.com stay", start_location_name: "Hotel Gracery", start_date: "2027-04-11" }), existing)).toBe(hotel);
    expect(findDuplicate(form({ type: "stay", title: "Hotel Gracery", start_date: "2027-04-12" }), existing)).toBeNull();
  });

  it("ignores blanks: an empty confirmation number or name matches nothing", () => {
    const blankItem = makeItem({ type: "activity", title: "", day: "2027-04-10", confirmation_number: null });
    expect(findDuplicate(form({ type: "activity", title: "", confirmation_number: "" }), [blankItem])).toBeNull();
  });
});
