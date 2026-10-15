"use client";

import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useDeleteItem } from "@/lib/data/hooks";
import type { Item } from "@/types";

type Props = {
  tripId: string;
  item: Item | null;
  onClose: () => void;
  onDeleted: (item: Item) => void;
  /** Where focus goes after a delete, since the button that opened the dialog is gone with the item. */
  afterDeleteFocus: (item: Item) => HTMLElement | null;
};

/** Confirms before deleting an item (ITEM-6). */
export function DeleteItemDialog({ tripId, item, onClose, onDeleted, afterDeleteFocus }: Props) {
  const remove = useDeleteItem(tripId);
  const [deleted, setDeleted] = useState(false);
  // Keep the title while the dialog animates closed after the item is gone.
  const [shown, setShown] = useState(item);
  if (item && item !== shown) {
    setShown(item);
    setDeleted(false);
  }

  return (
    <ConfirmDeleteDialog
      open={item !== null}
      title={`Delete “${shown?.title}”?`}
      description="It will be removed from the itinerary and the budget. This can't be undone."
      confirmLabel="Delete"
      failure="We couldn't delete this item. Please try again."
      onClose={onClose}
      onConfirm={async () => {
        if (!item) return;
        await remove.mutateAsync(item.id);
        setDeleted(true);
        onDeleted(item);
      }}
      finalFocus={deleted && shown ? () => afterDeleteFocus(shown) ?? true : true}
    />
  );
}
