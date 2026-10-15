"use client";

import { useState, type ComponentProps } from "react";
import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Shown if `onConfirm` throws, so nothing is lost silently. */
  failure: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  finalFocus?: ComponentProps<typeof AlertDialogContent>["finalFocus"];
};

/** Asks before deleting something, and says so if the delete fails (ITEM-6, TRIP-4). */
export function ConfirmDeleteDialog({ open, title, description, confirmLabel, failure, onConfirm, onClose, finalFocus }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setError(null);
        onClose();
      }}
    >
      <AlertDialogContent finalFocus={finalFocus}>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AlertDialogClose render={<Button variant="outline" className="min-h-11" />}>Cancel</AlertDialogClose>
          <Button variant="destructive" className="min-h-11" disabled={busy} onClick={confirm}>
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
