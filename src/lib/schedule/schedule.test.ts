import { describe, expect, it } from "vitest";
import { scheduleNotes } from "@/lib/schedule";
import { makeItem } from "@/test/factories";
import type { Item } from "@/types";

// Tokyo Station and Shinjuku are about 6 km apart (about 12 min at 30 km/h). Haneda is about 14 km from Tokyo Station.
const TOKYO = { start_lat: 35.6812, start_lng: 139.7671 };
const SHINJUKU = { start_lat: 35.6896, start_lng: 139.7006 };
const HANEDA = { start_lat: 35.5494, start_lng: 139.7798 };

const z = "Asia/Tokyo";
// Times are UTC on the same day (00:00Z is 09:00 in Tokyo).
const at = (time: string, end?: string, over: Partial<Item> = {}) =>
  makeItem({ start_at: `2027-04-12T${time}:00Z`, end_at: end ? `2027-04-12T${end}:00Z` : null, start_timezone: z, end_timezone: z, ...over });
// The note for the pair (a, b), which is keyed by b.
const note = (a: Item, b: Item) => scheduleNotes([a, b])[b.id];

describe("scheduleNotes", () => {
  it("flags an overlap by how far the next item starts before the previous ends", () => {
    expect(note(at("01:00", "03:00", { title: "Museum" }), at("02:30", "04:00"))).toEqual({
      kind: "overlap",
      text: "Overlap: starts 30 min before Museum ends",
    });
  });

  it("compares instants across zones, not clock times", () => {
    // The flight ends at 20:00Z (13:00 in Los Angeles). 19:00Z is before that, 21:00Z (14:00 there) is after.
    const flight = at("12:00", "20:00", { type: "flight", end_timezone: "America/Los_Angeles" });
    const early = makeItem({ start_at: "2027-04-12T19:00:00Z", start_timezone: "America/Los_Angeles" });
    expect(note(flight, early).kind).toBe("overlap");
    const later = makeItem({ start_at: "2027-04-12T21:00:00Z", start_timezone: "America/Los_Angeles" });
    expect(note(flight, later)).toBeUndefined(); // a 1 h gap is exactly the hour allowed after landing
  });

  it("flags a tight connection when the gap is shorter than the straight-line travel time", () => {
    const result = note(at("01:00", "02:00", TOKYO), at("02:05", "03:00", SHINJUKU));
    expect(result.kind).toBe("tight");
    expect(result.text).toMatch(/^Tight connection: 5 min between, about \d+ min needed$/);
  });

  it("leaves a gap that covers the travel time alone", () => {
    expect(note(at("01:00", "02:00", TOKYO), at("02:30", "03:00", SHINJUKU))).toBeUndefined();
  });

  it("leaves from the previous item's end location", () => {
    const train = at("01:00", "02:00", { ...TOKYO, end_lat: HANEDA.start_lat, end_lng: HANEDA.start_lng });
    expect(note(train, at("02:05", "03:00", TOKYO)).kind).toBe("tight"); // leaves from Haneda, not Tokyo
    expect(note(at("01:00", "02:00", TOKYO), at("02:05", "03:00", TOKYO))).toBeUndefined(); // same place
  });

  it("treats a previous item without an end as ending when it starts", () => {
    expect(note(at("01:00", undefined, TOKYO), at("01:05", "02:00", SHINJUKU)).kind).toBe("tight");
  });

  it("says nothing when the next item starts before an end-less previous one (manual order)", () => {
    expect(note(at("03:00"), at("01:00"))).toBeUndefined();
  });

  it("does not estimate travel when either end has no coordinates", () => {
    expect(note(at("01:00", "02:00", TOKYO), at("02:01", "03:00"))).toBeUndefined();
    expect(note(at("01:00", "02:00"), at("02:01", "03:00", SHINJUKU))).toBeUndefined();
  });

  it("expects two hours at the airport before a departure", () => {
    const stop = at("01:00", "02:00", TOKYO);
    const result = note(stop, at("03:30", "10:00", { ...HANEDA, type: "flight" }));
    expect(result.kind).toBe("tight");
    expect(result.text).toContain("with airport time");
    expect(note(stop, at("05:00", "10:00", { ...HANEDA, type: "flight" })).kind).toBe("free");
  });

  it("expects an hour after landing, even without coordinates", () => {
    const flight = at("01:00", "02:00", { type: "flight" });
    expect(note(flight, at("02:30", "03:00")).kind).toBe("tight");
    expect(note(flight, at("03:00", "03:30"))).toBeUndefined();
  });

  it("shows gaps of two hours or more as free time, and shorter ones as nothing", () => {
    const a = at("01:00", "02:00");
    expect(note(a, at("04:00", "05:00"))).toEqual({ kind: "free", text: "Free time: 2 h" });
    expect(note(a, at("03:59", "05:00"))).toBeUndefined();
    expect(note(a, at("04:45", "05:00")).text).toBe("Free time: 2 h 45 min");
  });

  it("skips flexible, untimed and stay items, so the timed ones either side are compared", () => {
    const [a, b] = [at("01:00", "02:00"), at("05:00", "06:00")];
    const skipped = [at("02:30", "03:00", { is_flexible: true }), makeItem(), at("02:30", "03:00", { type: "stay" })];
    expect(scheduleNotes([a, ...skipped, b])[b.id].kind).toBe("free");
    expect(Object.keys(scheduleNotes([a, ...skipped, b]))).toEqual([b.id]);
  });

  it("gives one note per pair, with overlap taking precedence", () => {
    const [a, b, c] = [at("01:00", "04:00"), at("03:00", "04:00"), at("08:00", "09:00")];
    const result = scheduleNotes([a, b, c]);
    expect(result[b.id].kind).toBe("overlap");
    expect(result[c.id].kind).toBe("free");
    expect(result[a.id]).toBeUndefined();
  });

  it("handles fewer than two timed items", () => {
    expect(scheduleNotes([])).toEqual({});
    expect(scheduleNotes([at("01:00")])).toEqual({});
  });
});
