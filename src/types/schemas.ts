import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const money = z.number().nonnegative("Cost cannot be negative");

export const ItemTypeSchema = z.enum(["flight", "stay", "activity"]);
export const BookingStatusSchema = z.enum(["idea", "planned", "reserved"]);
export const PaymentStatusSchema = z.enum(["unpaid", "paid"]);

const TripBase = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string().min(1, "Name is required"),
  start_date: isoDate,
  end_date: isoDate,
  destinations: z.array(z.string()),
  currency: z.string().length(3),
  total_budget: money.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const endNotBeforeStart = (t: { start_date: string; end_date: string }) => t.end_date >= t.start_date;
const tripDateIssue = { message: "End date cannot be before start date", path: ["end_date"] };

export const TripSchema = TripBase.refine(endNotBeforeStart, tripDateIssue);
export const NewTripSchema = TripBase.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).refine(endNotBeforeStart, tripDateIssue);

const ItemBase = z.object({
  id: z.string(),
  trip_id: z.string(),
  type: ItemTypeSchema,
  title: z.string().min(1, "Title is required"),
  notes: z.string().nullable(),
  day: isoDate,
  is_flexible: z.boolean(),
  start_at: z.string().nullable(),
  end_at: z.string().nullable(),
  start_timezone: z.string().nullable(),
  end_timezone: z.string().nullable(),
  start_location_name: z.string().nullable(),
  start_address: z.string().nullable(),
  start_lat: z.number().nullable(),
  start_lng: z.number().nullable(),
  end_location_name: z.string().nullable(),
  end_address: z.string().nullable(),
  end_lat: z.number().nullable(),
  end_lng: z.number().nullable(),
  estimated_cost: money.nullable(),
  actual_cost: money.nullable(),
  status: BookingStatusSchema,
  payment_status: PaymentStatusSchema,
  confirmation_number: z.string().nullable(),
  position: z.number(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

type Rules = {
  status: string;
  payment_status: string;
  start_at: string | null;
  end_at: string | null;
};
const paidIsReserved = (i: Rules) => i.payment_status !== "paid" || i.status === "reserved";
const endNotBeforeStartAt = (i: Rules) =>
  !i.start_at || !i.end_at || Date.parse(i.end_at) >= Date.parse(i.start_at);
const paidIssue = { message: "A paid item must be reserved", path: ["status"] };
const timeIssue = { message: "End cannot be before start", path: ["end_at"] };

export const ItemSchema = ItemBase.refine(paidIsReserved, paidIssue).refine(endNotBeforeStartAt, timeIssue);
export const NewItemSchema = ItemBase.omit({ id: true, created_at: true, updated_at: true })
  .refine(paidIsReserved, paidIssue)
  .refine(endNotBeforeStartAt, timeIssue);
