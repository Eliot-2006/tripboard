import { describe, expect, it } from "vitest";
import { formToItem, itemFormSchema } from "@/lib/items/form";
import { makeTrip } from "@/test/factories";
import { draftsToForms, draftToForm, fillZones, MAX_DRAFTS } from "./map";
import { DraftSchema, ExtractionSchema, extractionJsonSchema, type Draft } from "./schema";

const draft = (over: Partial<Draft> = {}): Draft => ({
  type: "activity",
  title: "Senso-ji tour",
  start_date: "2027-04-12",
  start_time: "10:00",
  start_timezone: "Asia/Tokyo",
  end_date: null,
  end_time: null,
  end_timezone: null,
  start_place: null,
  end_place: null,
  address: null,
  cost: null,
  currency: null,
  confirmation_number: null,
  airline: null,
  flight_number: null,
  notes: null,
  ...over,
});

const trip = makeTrip({ currency: "USD" });

describe("draftToForm", () => {
  it("keeps a flight's local times and zones, and a next-day arrival lands on the next day", () => {
    const form = draftToForm(
      draft({
        type: "flight",
        title: "LAX to Tokyo",
        start_date: "2027-04-10",
        start_time: "11:30",
        start_timezone: "America/Los_Angeles",
        end_date: "2027-04-11",
        end_time: "15:45",
        end_timezone: "Asia/Tokyo",
        start_place: "LAX",
        end_place: "HND",
        airline: "ANA",
        flight_number: "NH105",
      }),
      trip,
    );
    expect(itemFormSchema(trip).safeParse(form).success).toBe(true);
    const item = formToItem(form, trip.id);
    expect(item.start_at).toBe("2027-04-10T18:30:00.000Z"); // 11:30 PDT
    expect(item.end_at).toBe("2027-04-11T06:45:00.000Z"); // 15:45 JST the next day
    expect(item.day).toBe("2027-04-10");
    expect(item.start_timezone).toBe("America/Los_Angeles");
    expect(item.end_timezone).toBe("Asia/Tokyo");
    expect(item.metadata).toMatchObject({ airline: "ANA", flight_number: "NH105" });
  });

  it("converts an overnight flight that crosses the date line", () => {
    const item = formToItem(
      draftToForm(
        draft({
          type: "flight",
          title: "Tokyo to LA",
          start_date: "2027-04-17",
          start_time: "18:00",
          start_timezone: "Asia/Tokyo",
          end_date: "2027-04-17",
          end_time: "11:00",
          end_timezone: "America/Los_Angeles",
        }),
        trip,
      ),
      trip.id,
    );
    expect(item.start_at).toBe("2027-04-17T09:00:00.000Z");
    expect(item.end_at).toBe("2027-04-17T18:00:00.000Z");
  });

  it("resolves zone aliases and cities, and leaves an unknown zone blank", () => {
    expect(draftToForm(draft({ start_timezone: "US/Pacific" }), trip).start_timezone).toBe("America/Los_Angeles");
    expect(draftToForm(draft({ start_timezone: "Tokyo" }), trip).start_timezone).toBe("Asia/Tokyo");
    expect(draftToForm(draft({ start_timezone: "Mars/Olympus" }), trip).start_timezone).toBe("");
  });

  it("makes an item with no time 'No exact time'", () => {
    const form = draftToForm(draft({ start_time: null }), trip);
    expect(form.is_flexible).toBe(true);
    expect(formToItem(form, trip.id)).toMatchObject({ start_at: null, end_at: null });
  });

  it("drops times that are not real clock times", () => {
    expect(draftToForm(draft({ start_time: "25:99" }), trip).start_time).toBe("");
    expect(draftToForm(draft({ start_time: "9:05" }), trip).start_time).toBe("09:05");
  });

  it("keeps a stay's check-in and check-out and uses the name as the place", () => {
    const item = formToItem(
      draftToForm(
        draft({ type: "stay", title: "Hotel Gracery", start_time: "15:00", end_date: "2027-04-14", end_time: "11:00", end_place: "ignored" }),
        trip,
      ),
      trip.id,
    );
    expect(item.day).toBe("2027-04-12");
    expect(item.end_at).toBe("2027-04-14T02:00:00.000Z");
    expect(item.start_location_name).toBe("Hotel Gracery");
    expect(item.end_location_name).toBeNull();
  });

  it("ends an activity the next day when it ends earlier than it starts", () => {
    const item = formToItem(draftToForm(draft({ start_time: "22:00", end_time: "01:00" }), trip), trip.id);
    expect(item.end_at).toBe("2027-04-12T16:00:00.000Z");
  });

  it("puts the price in the budget only when it is in the trip's currency", () => {
    expect(draftToForm(draft({ cost: 120.5, currency: "usd" }), trip)).toMatchObject({ estimated_cost: "120.5", notes: "" });
    expect(draftToForm(draft({ cost: 120.5 }), trip).estimated_cost).toBe("120.5");
    expect(draftToForm(draft({ cost: 18000, currency: "JPY", notes: "Table by the window" }), trip)).toMatchObject({
      estimated_cost: "",
      notes: "Table by the window\nPrice: 18000 JPY",
    });
  });

  it("leaves status planned and unpaid: an import never marks anything paid", () => {
    expect(draftToForm(draft(), trip)).toMatchObject({ status: "planned", payment_status: "unpaid" });
  });

  it("caps long text", () => {
    expect(draftToForm(draft({ title: "x".repeat(900) }), trip).title).toHaveLength(500);
  });

  it("leaves a missing date blank so the form asks for it", () => {
    const form = draftToForm(draft({ start_date: "tomorrow" }), trip);
    expect(form.start_date).toBe("");
    expect(itemFormSchema(trip).safeParse(form).success).toBe(false);
  });
});

describe("draftsToForms and fillZones", () => {
  it("keeps at most MAX_DRAFTS drafts", () => {
    expect(draftsToForms(Array.from({ length: MAX_DRAFTS + 5 }, () => draft()), trip)).toHaveLength(MAX_DRAFTS);
  });

  it("fills the zones the document did not give", () => {
    const form = fillZones(draftToForm(draft({ start_timezone: null }), trip), "Europe/Paris");
    expect(form).toMatchObject({ start_timezone: "Europe/Paris", end_timezone: "Europe/Paris" });
    expect(fillZones(draftToForm(draft(), trip), "Europe/Paris").start_timezone).toBe("Asia/Tokyo");
  });
});

describe("schema", () => {
  it("rejects output that does not match, such as an unknown type", () => {
    expect(ExtractionSchema.safeParse({ items: [{ ...draft(), type: "car" }] }).success).toBe(false);
    expect(ExtractionSchema.safeParse({ items: "nope" }).success).toBe(false);
    expect(DraftSchema.safeParse(draft()).success).toBe(true);
  });

  it("derives the JSON schema from the item types", () => {
    const schema = JSON.stringify(extractionJsonSchema());
    expect(schema).toContain('"flight"');
    expect(schema).toContain('"stay"');
    expect(schema).not.toContain("$schema");
  });
});
