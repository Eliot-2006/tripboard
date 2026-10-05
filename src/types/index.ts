import type { z } from "zod";
import type {
  BookingStatusSchema,
  ItemSchema,
  ItemTypeSchema,
  NewItemSchema,
  NewTripSchema,
  PaymentStatusSchema,
  TripSchema,
} from "./schemas";

export * from "./schemas";

export type Trip = z.infer<typeof TripSchema>;
export type NewTrip = z.infer<typeof NewTripSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type NewItem = z.infer<typeof NewItemSchema>;
export type ItemPatch = Partial<NewItem>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
