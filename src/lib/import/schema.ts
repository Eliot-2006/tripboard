import { z } from "zod";
import { ItemTypeSchema } from "@/types/schemas";

/**
 * What the model returns for one booking. Field names follow the item form, and the type comes straight from the
 * item schema. Times are local wall-clock values plus an IANA zone, never UTC: `map.ts` turns them into form values and
 * `formToItem` into UTC. No min/max keywords, since structured output does not support them: sizes are capped in `map.ts`.
 */
export const DraftSchema = z.object({
  type: ItemTypeSchema,
  title: z.string(),
  start_date: z.string().nullable().describe("Local date, YYYY-MM-DD. Flight departure, hotel check-in, activity start."),
  start_time: z.string().nullable().describe("Local 24-hour time, HH:MM, at the start place. Null if the document gives none."),
  start_timezone: z.string().nullable().describe("IANA zone of the start place, such as America/Los_Angeles."),
  end_date: z.string().nullable().describe("Local date, YYYY-MM-DD. Flight arrival date (may be the next day), hotel check-out."),
  end_time: z.string().nullable().describe("Local 24-hour time, HH:MM, at the end place."),
  end_timezone: z.string().nullable().describe("IANA zone of the end place. Flights only."),
  start_place: z.string().nullable().describe("Departure airport or city; hotel or venue name."),
  end_place: z.string().nullable().describe("Arrival airport or city. Flights, or an activity that ends elsewhere."),
  address: z.string().nullable(),
  cost: z.number().nullable().describe("Total price as a number, no currency symbol."),
  currency: z.string().nullable().describe("ISO 4217 code of the price, such as USD."),
  confirmation_number: z.string().nullable(),
  airline: z.string().nullable(),
  flight_number: z.string().nullable(),
  notes: z.string().nullable().describe("Anything else worth keeping, briefly: seat, room type, check-in instructions."),
});

export const ExtractionSchema = z.object({ items: z.array(DraftSchema) });

export type Draft = z.infer<typeof DraftSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;

/** The JSON Schema sent to the model, derived from `ExtractionSchema`. */
export function extractionJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(ExtractionSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
