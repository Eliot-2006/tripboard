import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import {
  dayDiff,
  daysBetween,
  formatDateTime,
  formatDay,
  formatItemTime,
  formatTime,
  isRealLocalTime,
  localDay,
  localToUtcIso,
  nextDay,
  resolveTimeZone,
  shiftDays,
  shiftItemToDay,
  timeZoneOptions,
} from "@/lib/time";

const LA = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";

describe("overnight cross-time-zone flight (LAX to Tokyo)", () => {
  const dep = localToUtcIso("2027-04-10", "11:30", LA);
  const arr = localToUtcIso("2027-04-11", "15:45", TOKYO);

  it("converts local wall time to UTC", () => {
    expect(dep).toBe("2027-04-10T18:30:00.000Z");
    expect(arr).toBe("2027-04-11T06:45:00.000Z");
  });

  it("departs and arrives on different local days", () => {
    expect(localDay(dep, LA)).toBe("2027-04-10");
    expect(localDay(arr, TOKYO)).toBe("2027-04-11");
  });

  it("keeps the local day when UTC has already rolled over", () => {
    const lateEvening = localToUtcIso("2027-04-10", "20:00", LA); // 03:00Z on the 11th
    expect(lateEvening.startsWith("2027-04-11")).toBe(true);
    expect(localDay(lateEvening, LA)).toBe("2027-04-10");
  });

  it("formats each end in its own zone", () => {
    expect(formatTime(dep, LA)).toBe("11:30 AM");
    expect(formatTime(arr, TOKYO)).toBe("3:45 PM");
    expect(formatDateTime(dep, LA)).toContain("11:30 AM");
  });
});

describe("shiftDays", () => {
  it("keeps the local clock time", () => {
    expect(shiftDays("2027-04-12T00:00:00.000Z", TOKYO, 1)).toBe("2027-04-13T00:00:00.000Z");
  });

  it("keeps the local clock time across a DST change", () => {
    // 09:00 PST on Mar 13 2027, DST starts Mar 14: 09:00 PDT is one hour earlier in UTC
    expect(shiftDays("2027-03-13T17:00:00.000Z", LA, 2)).toBe("2027-03-15T16:00:00.000Z");
  });

  it("moves backwards", () => {
    expect(shiftDays("2027-04-13T00:00:00.000Z", TOKYO, -1)).toBe("2027-04-12T00:00:00.000Z");
  });
});

describe("days", () => {
  it("dayDiff counts whole days, signed", () => {
    expect(dayDiff("2027-04-10", "2027-04-13")).toBe(3);
    expect(dayDiff("2027-04-13", "2027-04-10")).toBe(-3);
  });

  it("daysBetween is inclusive and empty for an inverted range", () => {
    expect(daysBetween("2027-04-10", "2027-04-12")).toEqual(["2027-04-10", "2027-04-11", "2027-04-12"]);
    expect(daysBetween("2027-04-12", "2027-04-10")).toEqual([]);
  });

  it("formatDay is zone-independent", () => {
    expect(formatDay("2027-04-10")).toBe("Sat, Apr 10");
  });
});

describe("formatItemTime", () => {
  it("says Anytime for flexible items", () => {
    expect(formatItemTime(makeItem({ is_flexible: true }))).toBe("Anytime");
  });

  it("says Anytime when there is no start time", () => {
    expect(formatItemTime(makeItem({ start_at: null }))).toBe("Anytime");
  });

  it("formats the start in the item's zone", () => {
    const item = makeItem({ start_at: "2027-04-12T00:00:00.000Z", start_timezone: TOKYO });
    expect(formatItemTime(item)).toBe("9:00 AM");
  });
});

describe("invalid input", () => {
  it("throws on an unknown time zone", () => {
    expect(() => localDay("2027-04-10T00:00:00.000Z", "Mars/Olympus")).toThrow();
  });
});

describe("shiftItemToDay", () => {
  const timed = (over: Parameters<typeof makeItem>[0]) => makeItem({ is_flexible: false, ...over });

  it("keeps the local clock time on the new day", () => {
    const item = timed({
      start_at: "2027-04-12T00:00:00.000Z",
      end_at: "2027-04-12T02:00:00.000Z",
      start_timezone: TOKYO,
      end_timezone: TOKYO,
    });
    expect(shiftItemToDay(item, "2027-04-13")).toEqual({
      start_at: "2027-04-13T00:00:00.000Z",
      end_at: "2027-04-13T02:00:00.000Z",
    });
  });

  it("keeps a multi-day flight's arrival the same number of days after departure", () => {
    const flight = timed({
      start_at: "2027-04-10T18:30:00.000Z", // 11:30 PDT
      end_at: "2027-04-11T06:45:00.000Z", // 15:45 JST next day
      start_timezone: LA,
      end_timezone: TOKYO,
    });
    expect(shiftItemToDay(flight, "2027-04-12")).toEqual({
      start_at: "2027-04-12T18:30:00.000Z",
      end_at: "2027-04-13T06:45:00.000Z",
    });
  });

  it("keeps a short cross-zone flight from arriving before it departs", () => {
    const flight = timed({
      start_at: "2027-06-10T17:00:00.000Z", // 10:00 PDT
      end_at: "2027-06-10T17:30:00.000Z", // 10:30 MST (Phoenix has no DST)
      start_timezone: LA,
      end_timezone: "America/Phoenix",
    });
    expect(shiftItemToDay(flight, "2027-01-10")).toEqual({
      start_at: "2027-01-10T18:00:00.000Z",
      end_at: "2027-01-10T18:30:00.000Z",
    });
  });

  it("keeps the duration when the start lands in a DST gap", () => {
    const item = timed({
      start_at: "2027-03-13T07:30:00.000Z", // 02:30 EST, which does not exist on Mar 14
      end_at: "2027-03-13T08:10:00.000Z",
      start_timezone: "America/New_York",
      end_timezone: "America/New_York",
    });
    const moved = shiftItemToDay(item, "2027-03-14");
    expect(Date.parse(moved.end_at!) - Date.parse(moved.start_at!)).toBe(40 * 60 * 1000);
  });

  it("leaves flexible and untimed items alone", () => {
    expect(shiftItemToDay(makeItem({ is_flexible: true }), "2027-04-14")).toEqual({ start_at: null, end_at: null });
    expect(shiftItemToDay(makeItem({ start_at: null }), "2027-04-14")).toEqual({ start_at: null, end_at: null });
  });
});

describe("resolveTimeZone", () => {
  it("accepts zone ids in any letter case and returns the canonical id", () => {
    expect(resolveTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(resolveTimeZone(" asia/tokyo ")).toBe("Asia/Tokyo");
    expect(resolveTimeZone("utc")).toBe("UTC");
  });

  it("accepts a zone's city, with spaces or underscores", () => {
    expect(resolveTimeZone("Los Angeles")).toBe("America/Los_Angeles");
    expect(resolveTimeZone("new_york")).toBe("America/New_York");
    expect(resolveTimeZone("tokyo")).toBe("Asia/Tokyo");
  });

  it("rejects unknown names, blanks and fixed offsets", () => {
    expect(resolveTimeZone("Tokio")).toBeNull();
    expect(resolveTimeZone("  ")).toBeNull();
    expect(resolveTimeZone("+09:00")).toBeNull();
    expect(resolveTimeZone("EST")).toBeNull();
    expect(resolveTimeZone("Etc/GMT+9")).toBeNull();
  });

  it("canonicalises aliases to a listed zone", () => {
    expect(resolveTimeZone("us/pacific")).toBe("America/Los_Angeles");
    expect(resolveTimeZone("gmt")).toBe("UTC");
  });

  it("finds renamed cities whichever name the browser lists", () => {
    for (const [city, offset] of [
      ["Kolkata", "+5:30"],
      ["Calcutta", "+5:30"],
      ["Kyiv", "+3"],
      ["Ho Chi Minh", "+7"],
    ]) {
      const zone = resolveTimeZone(city);
      expect(zone, city).not.toBeNull();
      expect(formatDateTime("2027-07-01T00:00:00.000Z", zone!), city).toContain(`GMT${offset}`);
    }
  });
});

describe("timeZoneOptions", () => {
  it("labels each zone with its city and offset", () => {
    const tokyo = timeZoneOptions().find((o) => o.value === "Asia/Tokyo");
    expect(tokyo?.label).toBe("Tokyo · GMT+9");
    expect(timeZoneOptions().some((o) => o.value === "UTC")).toBe(true);
  });
});

describe("isRealLocalTime", () => {
  it("is false inside a spring-forward gap and true otherwise", () => {
    expect(isRealLocalTime("2027-03-14", "02:30", "America/New_York")).toBe(false);
    expect(isRealLocalTime("2027-03-14", "03:30", "America/New_York")).toBe(true);
    expect(isRealLocalTime("2027-11-07", "01:30", "America/New_York")).toBe(true); // repeated hour still exists
  });
});

describe("nextDay", () => {
  it("crosses month and year ends", () => {
    expect(nextDay("2027-04-30")).toBe("2027-05-01");
    expect(nextDay("2027-12-31")).toBe("2028-01-01");
  });
});

describe("formatDateTime", () => {
  it("shows a GMT offset for every zone", () => {
    expect(formatDateTime("2027-04-10T18:30:00.000Z", "America/Los_Angeles")).toBe("Sat, Apr 10, 11:30 AM GMT-7");
    expect(formatDateTime("2027-04-11T06:45:00.000Z", "Asia/Tokyo")).toBe("Sun, Apr 11, 3:45 PM GMT+9");
  });
});

describe("formatItemTime for flights", () => {
  const flight = makeItem({
    type: "flight",
    start_at: "2027-04-10T18:30:00.000Z",
    end_at: "2027-04-11T06:45:00.000Z",
    start_timezone: "America/Los_Angeles",
    end_timezone: "Asia/Tokyo",
  });

  it("shows the arrival, marked +1 when it lands on a later local day", () => {
    expect(formatItemTime(flight)).toBe("11:30 AM → 3:45 PM +1");
  });

  it("leaves out +N for a same-day arrival and shows other types' start only", () => {
    expect(formatItemTime({ ...flight, end_at: "2027-04-10T20:00:00.000Z", end_timezone: "America/Los_Angeles" })).toBe(
      "11:30 AM → 1:00 PM",
    );
    expect(formatItemTime({ ...flight, type: "activity" })).toBe("11:30 AM");
  });

  it("marks an arrival on an earlier local day across the date line", () => {
    const eastbound = {
      ...flight,
      start_at: "2027-04-11T15:30:00.000Z", // Apr 12, 00:30 in Tokyo
      end_at: "2027-04-11T23:00:00.000Z", // Apr 11, 13:00 in Honolulu
      start_timezone: "Asia/Tokyo",
      end_timezone: "Pacific/Honolulu",
    };
    expect(formatItemTime(eastbound)).toBe("12:30 AM → 1:00 PM −1");
  });
});
