"use client";

import { useState, type ComponentProps } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DetailCard } from "./DetailCard";

type Props = Omit<ComponentProps<typeof DetailCard>, "item" | "id" | "bare"> & {
  item: ComponentProps<typeof DetailCard>["item"] | null;
};

const shownOnScreen = (el: HTMLElement | null) => (el && el.getClientRects().length > 0 ? el : null);
const focusAfter = (item: { id: string; day: string }) =>
  shownOnScreen(document.querySelector<HTMLElement>(`[data-item-row="${CSS.escape(item.id)}"] [aria-expanded]`)) ??
  shownOnScreen(document.getElementById(`day-${item.day}`));

/** On phones the selected item's details open as a bottom sheet, over the itinerary or the map (ITIN-3, UX-2). */
export function DetailSheet({ item, onClose, ...card }: Props) {
  // Keep showing the item while the sheet slides away.
  const [shown, setShown] = useState(item);
  if (item && item !== shown) setShown(item);

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      {/*
        Focus goes back to the item's card, or to its day when the item was deleted from the sheet. In the map view
        both are hidden, so it falls back to where the sheet was opened from (the pin).
      */}
      <DialogContent aria-label="Item details" className="max-h-[75dvh]" finalFocus={() => (shown && focusAfter(shown)) || true}>
        {shown && <DetailCard id={`details-${shown.id}`} item={shown} onClose={onClose} bare {...card} />}
      </DialogContent>
    </Dialog>
  );
}
