import type { BookingStatus, Item, ItemType, PaymentStatus } from "@/types";

export const TYPE_LABEL: Record<ItemType, string> = { flight: "Flight", stay: "Stay", activity: "Activity" };
export const STATUS_LABEL: Record<BookingStatus, string> = { idea: "Idea", planned: "Planned", reserved: "Reserved" };
export const PAYMENT_LABEL: Record<PaymentStatus, string> = { unpaid: "Unpaid", paid: "Paid" };

export function locationLabel(item: Item): string | null {
  const { start_location_name: from, end_location_name: to } = item;
  if (from && to) return `${from} → ${to}`;
  return from ?? to;
}
