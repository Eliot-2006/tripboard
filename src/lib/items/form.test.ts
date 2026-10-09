import { describe, expect, it } from "vitest";
import { loadDemoSeed } from "@/lib/data/demo-seed";
import { makeItem, makeTrip } from "@/test/factories";
import {
  defaultTimeZone,
  emptyItemForm,
  formToItem,
  itemFormSchema,
  itemToForm,
  type ItemFormValues,
  placeItem,
  withPaymentRule,
} from "./form";

const trip = makeTrip({ start_date: "2027-04-10", end_date: "2027-04-18" });
const schema = itemFormSchema(trip);

const form = (over: Partial<ItemFormValues> = {}): ItemFormValues => ({
  ...emptyItemForm("activity", "2027-04-12", "Asia/Tokyo"),
  title: "Senso-ji",
  start_time: "09:00",
  ...over,
});

/** Field paths with errors, so tests assert where a message shows up (UX-4). */
const errors = (v: ItemFormValues) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("itemToForm and formToItem", () => {
  const { items } = loadDemoSeed();

  it.each(items.map((i) => [i.title, i] as const))("round-trips %s unchanged", (_title, item) => {
    const values = itemToForm(item, "UTC");
    expect(errors(values)).toEqual({});
    const saved = formToItem(values, item.trip_id, item);
    const { id, position, created_at, updated_at } = item;
    const metadata = item.type === "activity" ? { category: "activity", ...item.metadata } : item.metadata;
    expect({ ...saved, id, position, created_at, updated_at }).toEqual({ ...item, metadata });
  });

  it("stores an overnight cross-time-zone flight in UTC with each end in its own zone", () => {
    const flight = formToItem(
      form({
        type: "flight",
        title: "LAX to Tokyo",
        start_date: "2027-04-10",
        start_time: "11:30",
        start_timezone: "America/Los_Angeles",
        end_date: "2027-04-11",
        end_time: "15:45",
        end_timezone: "Asia/Tokyo",
      }),
      "t1",
    );
    expect(flight).toMatchObject({
      day: "2027-04-10",
      start_at: "2027-04-10T18:30:00.000Z",
      end_at: "2027-04-11T06:45:00.000Z",
      start_timezone: "America/Los_Angeles",
      end_timezone: "Asia/Tokyo",
    });
  });

  it("saves only the day for a flexible item (ITEM-5)", () => {
    const item = formToItem(form({ is_flexible: true, start_time: "09:00", end_time: "10:00" }), "t1");
    expect(item).toMatchObject({ is_flexible: true, day: "2027-04-12", start_at: null, end_at: null, end_timezone: null });
  });

  it("ends an activity on its start date in its start zone", () => {
    const item = formToItem(form({ end_date: "2027-04-15", end_time: "11:00", end_timezone: "UTC" }), "t1");
    expect(item.end_at).toBe("2027-04-12T02:00:00.000Z");
    expect(item.end_timezone).toBe("Asia/Tokyo");
  });

  it("ends an activity the next day when its end time is earlier than its start", () => {
    const item = formToItem(form({ start_time: "22:00", end_time: "01:00" }), "t1");
    expect(item.start_at).toBe("2027-04-12T13:00:00.000Z");
    expect(item.end_at).toBe("2027-04-12T16:00:00.000Z");
    expect(errors(form({ start_time: "22:00", end_time: "01:00" }))).toEqual({});
  });

  it("stores time zones as canonical ids, from any case or a city name", () => {
    const item = formToItem(form({ start_timezone: "asia/tokyo" }), "t1");
    expect(item.start_timezone).toBe("Asia/Tokyo");
    const flight = formToItem(
      form({ type: "flight", start_timezone: "Los Angeles", end_time: "23:00", end_date: "2027-04-12", end_timezone: "tokyo" }),
      "t1",
    );
    expect([flight.start_timezone, flight.end_timezone]).toEqual(["America/Los_Angeles", "Asia/Tokyo"]);
  });

  it("does not move a timed item without a stored zone when saved unchanged", () => {
    const item = makeItem({ day: "2027-04-12", start_at: "2027-04-12T20:00:00.000Z", start_timezone: null });
    const saved = formToItem(itemToForm(item, "Asia/Tokyo"), "t1", item);
    expect(saved).toMatchObject({ day: "2027-04-12", start_at: "2027-04-12T20:00:00.000Z" });
  });

  it("uses a stay's name as its place and gives it no end place (ITEM-3)", () => {
    const stay = formToItem(
      form({ type: "stay", title: "Hotel Gracery", end_location_name: "Somewhere", end_lat: "1", end_lng: "2" }),
      "t1",
    );
    expect(stay).toMatchObject({ start_location_name: "Hotel Gracery", end_location_name: null, end_lat: null });
  });

  it("keeps metadata the form does not edit and drops cleared flight details", () => {
    const base = makeItem({ type: "flight", metadata: { airline: "ANA", flight_number: "NH105", seat: "32A" } });
    const item = formToItem({ ...itemToForm(base, "UTC"), title: "Flight", airline: " ", flight_number: "NH106" }, "t1", base);
    expect(item.metadata).toEqual({ flight_number: "NH106", seat: "32A" });
  });

  it("trims text and turns blanks into nulls", () => {
    const item = formToItem(form({ title: "  Lunch ", notes: "   ", estimated_cost: " 12.50 ", start_lat: "" }), "t1");
    expect(item).toMatchObject({ title: "Lunch", notes: null, estimated_cost: 12.5, start_lat: null });
  });

  it("marks a paid item reserved (ITEM-7)", () => {
    expect(formToItem(form({ status: "idea", payment_status: "paid" }), "t1").status).toBe("reserved");
  });
});

describe("itemFormSchema", () => {
  it("accepts a minimal timed item and a minimal flexible item", () => {
    expect(errors(form())).toEqual({});
    expect(errors(form({ is_flexible: true, start_time: "" }))).toEqual({});
  });

  it("requires a name", () => {
    expect(errors(form({ title: "  " }))).toEqual({ title: "Enter a name" });
  });

  it("requires a start time unless the item has no exact time", () => {
    expect(errors(form({ start_time: "" }))).toEqual({ start_time: 'Enter a start time, or choose "No exact time"' });
  });

  it("keeps the day inside the trip", () => {
    expect(errors(form({ start_date: "2027-04-19" }))).toEqual({
      start_date: "Pick a day between Sat, Apr 10 and Sun, Apr 18",
    });
  });

  it("rejects a check-out before the check-in, on the field that is wrong", () => {
    const stay = form({ type: "stay", start_time: "15:00", end_date: "2027-04-14", end_time: "11:00" });
    expect(errors(stay)).toEqual({});
    expect(errors({ ...stay, end_date: "2027-04-11" })).toEqual({ end_date: "Check-out cannot be before the check-in" });
    expect(errors({ ...stay, end_date: "2027-04-12", end_time: "14:00" })).toEqual({
      end_time: "Check-out cannot be before the check-in",
    });
  });

  it("compares flight times across zones, not clock readings", () => {
    const flight = form({
      type: "flight",
      start_time: "18:00",
      start_timezone: "Asia/Tokyo",
      end_date: "2027-04-12",
      end_time: "11:30",
      end_timezone: "America/Los_Angeles",
    });
    expect(errors(flight)).toEqual({});
    expect(errors({ ...flight, end_time: "01:00" })).toEqual({ end_time: "Arrival cannot be before the departure" });
  });

  it("requires a time when an end date is given", () => {
    expect(errors(form({ type: "stay", end_date: "2027-04-14" }))).toEqual({
      end_time: "Enter a check-out time, or clear the check-out date",
    });
  });

  it("rejects unknown time zones on timed items", () => {
    expect(errors(form({ start_timezone: "Tokio" }))).toEqual({
      start_timezone: "We don't recognise “Tokio”. Type a city like Tokyo, or pick from the list.",
    });
  });

  it("does not check the hidden zone of an item with no exact time, and drops it if invalid", () => {
    expect(errors(form({ is_flexible: true, start_timezone: "Tokio" }))).toEqual({});
    expect(formToItem(form({ is_flexible: true, start_timezone: "Tokio" }), "t1").start_timezone).toBeNull();
  });

  it("accepts a city name as a time zone", () => {
    expect(errors(form({ start_timezone: "Los Angeles" }))).toEqual({});
  });

  it("rejects a time skipped by daylight saving", () => {
    expect(errors(form({ start_date: "2027-04-12", start_timezone: "America/New_York", start_time: "02:30" }))).toEqual({});
    const trip = makeTrip({ start_date: "2027-03-10", end_date: "2027-03-20" });
    const r = itemFormSchema(trip).safeParse(form({ start_date: "2027-03-14", start_timezone: "America/New_York", start_time: "02:30" }));
    expect(r.success ? [] : r.error.issues.map((i) => [i.path.join("."), i.message])).toEqual([
      ["start_time", "02:30 doesn't exist on Sun, Mar 14 in America/New_York because the clocks change. Pick another time."],
    ]);
  });

  it("validates costs (ITEM-8)", () => {
    expect(errors(form({ estimated_cost: "0.29", actual_cost: "1200" }))).toEqual({});
    expect(errors(form({ estimated_cost: "-5" }))).toEqual({ estimated_cost: "Cost cannot be negative" });
    expect(errors(form({ estimated_cost: "12.345" }))).toEqual({ estimated_cost: "Use at most 2 decimal places" });
    expect(errors(form({ actual_cost: "$12" }))).toEqual({ actual_cost: "Enter an amount, like 120 or 120.50" });
    expect(errors(form({ actual_cost: "1e3" }))).toEqual({ actual_cost: "Enter an amount, like 120 or 120.50" });
    expect(errors(form({ estimated_cost: "9999999999.99" }))).toEqual({});
    expect(errors(form({ estimated_cost: "12345678901" }))).toEqual({ estimated_cost: "That amount is too large" });
  });

  it("validates coordinates in pairs and in range (ITEM-10)", () => {
    expect(errors(form({ start_lat: "35.7", start_lng: "139.8" }))).toEqual({});
    expect(errors(form({ start_lat: "35.7" }))).toEqual({ start_lng: "Enter the longitude too, or clear the other coordinate" });
    expect(errors(form({ start_lat: "0x10", start_lng: "abc" }))).toEqual({
      start_lat: "Enter a number, like 35.7148",
      start_lng: "Enter a number, like 139.7967",
    });
    expect(errors(form({ start_lat: "95", start_lng: "200" }))).toEqual({
      start_lat: "Latitude must be between -90 and 90",
      start_lng: "Longitude must be between -180 and 180",
    });
  });

  it("rejects a paid item that is not reserved", () => {
    expect(errors(form({ status: "planned", payment_status: "paid" }))).toEqual({ status: "A paid item must be reserved" });
  });
});

describe("withPaymentRule", () => {
  it("only changes the status of paid items", () => {
    expect(withPaymentRule("idea", "paid")).toBe("reserved");
    expect(withPaymentRule("planned", "unpaid")).toBe("planned");
  });
});

describe("placeItem (ITIN-10)", () => {
  const morning = makeItem({ id: "a", day: "2027-04-12", position: 1000, start_at: "2027-04-12T00:00:00.000Z" });
  const evening = makeItem({ id: "b", day: "2027-04-12", position: 2000, start_at: "2027-04-12T09:00:00.000Z" });
  const items = [evening, morning];

  it("puts a new timed item between the items around its start time", () => {
    expect(placeItem({ day: "2027-04-12", start_at: "2027-04-12T03:00:00.000Z" }, items)).toBe(1500);
  });

  it("appends a new flexible item", () => {
    expect(placeItem({ day: "2027-04-12", start_at: null }, items)).toBe(3000);
  });

  it("keeps the position of an edit that stays on its day", () => {
    expect(placeItem({ day: "2027-04-12", start_at: "2027-04-12T12:00:00.000Z" }, items, morning)).toBe(1000);
  });

  it("re-places an item edited onto another day", () => {
    const moved = makeItem({ id: "c", day: "2027-04-11", position: 1000 });
    expect(placeItem({ day: "2027-04-12", start_at: "2027-04-11T23:00:00.000Z" }, [...items, moved], moved)).toBe(0);
  });
});

describe("defaultTimeZone (ITEM-11)", () => {
  const { items } = loadDemoSeed();

  it("uses where the trip is by that day, after a flight's arrival", () => {
    expect(defaultTimeZone(items, "2027-04-10", "UTC")).toBe("Asia/Tokyo");
    expect(defaultTimeZone(items, "2027-04-18", "UTC")).toBe("America/Los_Angeles");
  });

  it("falls back to the first zoned item, then to the given zone", () => {
    expect(defaultTimeZone(items, "2027-04-01", "UTC")).toBe("America/Los_Angeles");
    expect(defaultTimeZone([], "2027-04-12", "Europe/Paris")).toBe("Europe/Paris");
  });
});
