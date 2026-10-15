"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCreateTrip, useDeleteTrip, useUpdateTrip } from "@/lib/data/hooks";
import { emptyTripForm, formToTrip, itemsOutside, tripFormSchema, tripToForm, type TripFormValues } from "@/lib/trips/form";
import type { Item, Trip } from "@/types";

/** Creating a new trip, or editing one with its items (to warn about dates that leave items out). */
export type TripEditor = { mode: "create" } | { mode: "edit"; trip: Trip; items: Item[] };

type Props = {
  editor: TripEditor | null;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
  /** Offered when editing. Left out where a trip can't be deleted, such as the demo. */
  onDeleted?: () => void;
};

const plans = (count: number) => (count === 0 ? "its plans" : count === 1 ? "its 1 item" : `its ${count} items`);

/** Create and edit a trip (TRIP-2, TRIP-3), and delete it after confirming (TRIP-4). */
export function TripDialog({ editor, onClose, onSaved, onDeleted }: Props) {
  // Keep the last content while the dialog animates closed, with a fresh form for each opening.
  const [shown, setShown] = useState({ editor, key: 0 });
  if (editor && editor !== shown.editor) setShown({ editor, key: shown.key + 1 });
  return (
    <Dialog open={editor !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {shown.editor && (
          <TripDialogBody key={shown.key} editor={shown.editor} onClose={onClose} onSaved={onSaved} onDeleted={onDeleted} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TripDialogBody({ editor, onClose, onSaved, onDeleted }: Omit<Props, "editor"> & { editor: TripEditor }) {
  const uid = useId();
  const editing = editor.mode === "edit" ? editor.trip : undefined;
  const create = useCreateTrip();
  const update = useUpdateTrip();
  const remove = useDeleteTrip();
  const [error, setError] = useState<string | null>(null);
  // Dates that would leave items out are saved only on a second press, after the warning (TRIP-3).
  const [warned, setWarned] = useState<{ start: string; end: string; count: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: editing ? tripToForm(editing) : emptyTripForm(),
  });

  const save = async (values: TripFormValues) => {
    setError(null);
    const trip = formToTrip(values);
    if (editor.mode === "edit") {
      const count = itemsOutside(editor.items, trip.start_date, trip.end_date).length;
      const confirmed = warned?.start === trip.start_date && warned.end === trip.end_date;
      if (count > 0 && !confirmed) {
        setWarned({ start: trip.start_date, end: trip.end_date, count });
        return;
      }
    }
    try {
      onSaved(editing ? await update.mutateAsync({ id: editing.id, patch: trip }) : await create.mutateAsync(trip));
    } catch {
      setError("We couldn't save the trip. Check your connection and try again.");
    }
  };

  const id = (name: keyof TripFormValues) => `${uid}-${name}`;
  const input = (name: keyof TripFormValues, label: string, props: ComponentProps<typeof Input> & { hint?: string } = {}) => {
    const { hint, className, ...rest } = props;
    return (
      <Field id={id(name)} label={label} error={errors[name]?.message} hint={hint} className={className}>
        {(a11y) => <Input {...a11y} {...rest} {...register(name)} />}
      </Field>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <DialogTitle>{editing ? `Edit “${editing.name}”` : "New trip"}</DialogTitle>
        <DialogDescription>
          {editing ? "Change any details and save." : "Name it and pick the dates. Everything else is optional."}
        </DialogDescription>
      </div>
      <form noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-4">
        {input("name", "Name", { hint: "For example Japan 2027", autoComplete: "off" })}
        <div className="grid grid-cols-2 gap-3">
          {input("start_date", "Start date", { type: "date" })}
          {input("end_date", "End date", { type: "date" })}
        </div>
        {input("destinations", "Destinations", { hint: "Separate places with commas, like Tokyo, Kyoto", autoComplete: "off" })}
        <div className="grid grid-cols-2 gap-3">
          {input("total_budget", "Total budget", { inputMode: "decimal", hint: "Optional" })}
          {input("currency", "Currency", { autoComplete: "off", maxLength: 3, className: "uppercase", hint: "Three letters, like USD" })}
        </div>
        {warned && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {warned.count === 1 ? "1 item falls" : `${warned.count} items fall`} outside these dates. They&apos;ll stay in the
            trip and its budget, but won&apos;t show in the itinerary until the dates include them again.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-11 px-4" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : warned ? "Save anyway" : editing ? "Save changes" : "Create trip"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 px-4" onClick={onClose}>
            Cancel
          </Button>
          {editing && onDeleted && (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto min-h-11 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete trip
            </Button>
          )}
        </div>
      </form>
      {editing && onDeleted && (
        <ConfirmDeleteDialog
          open={confirmDelete}
          title={`Delete “${editing.name}”?`}
          description={`The trip and ${plans(editor.mode === "edit" ? editor.items.length : 0)} will be deleted. This can't be undone.`}
          confirmLabel="Delete trip"
          failure="We couldn't delete this trip. Please try again."
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await remove.mutateAsync(editing.id);
            onDeleted();
          }}
        />
      )}
    </>
  );
}
