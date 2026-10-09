"use client";

import { useState } from "react";
import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  // Keep the title while the dialog animates closed after the item is gone.
  const [shown, setShown] = useState(item);
  if (item && item !== shown) setShown(item);

  const confirm = async () => {
    if (!item) return;
    setError(null);
    try {
      await remove.mutateAsync(item.id);
      setDeleted(true);
      onDeleted(item);
    } catch {
      setError("We couldn't delete this item. Please try again.");
    }
  };

  return (
    <AlertDialog
      open={item !== null}
      onOpenChange={(open) => {
        if (open) return;
        setError(null);
        onClose();
      }}
      onOpenChangeComplete={(open) => open && setDeleted(false)}
    >
      <AlertDialogContent finalFocus={deleted && shown ? () => afterDeleteFocus(shown) ?? true : true}>
        <AlertDialogTitle>Delete “{shown?.title}”?</AlertDialogTitle>
        <AlertDialogDescription>It will be removed from the itinerary and the budget. This can&apos;t be undone.</AlertDialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AlertDialogClose render={<Button variant="outline" className="min-h-11" />}>Cancel</AlertDialogClose>
          <Button variant="destructive" className="min-h-11" disabled={remove.isPending} onClick={confirm}>
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
