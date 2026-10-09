"use client";

import { BedDouble, MapPin, Plane } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCreateItem, useUpdateItem } from "@/lib/data/hooks";
import { defaultTimeZone, emptyItemForm, formToItem, itemToForm, placeItem, type ItemFormValues } from "@/lib/items/form";
import { browserTimeZone, formatDay } from "@/lib/time";
import type { Item, ItemType, Trip } from "@/types";
import { ItemForm } from "./ItemForm";
import { TYPE_LABEL } from "./labels";

/** What the dialog is doing: adding an item (optionally on a given day) or editing one. */
export type ItemEditor = { mode: "add"; day: string } | { mode: "edit"; item: Item };

type Props = {
  trip: Trip;
  items: Item[];
  editor: ItemEditor | null;
  onClose: () => void;
  /** `added` is false for an edit. */
  onSaved: (item: Item, added: boolean) => void;
};

export function ItemDialog({ trip, items, editor, onClose, onSaved }: Props) {
  // Keep showing the last content while the dialog animates closed. Each opening gets a fresh body (new key),
  // even if it reopens before the closing animation ends.
  const [shown, setShown] = useState({ editor, key: 0 });
  if (editor && editor !== shown.editor) setShown({ editor, key: shown.key + 1 });

  // Escape, the backdrop and Cancel all ask before throwing away typed changes.
  const dirty = useRef(false);
  const requestClose = () => {
    if (dirty.current && !window.confirm("Discard your changes to this item?")) return;
    dirty.current = false;
    onClose();
  };
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  return (
    <Dialog open={editor !== null} onOpenChange={(open) => !open && requestClose()}>
      <DialogContent>
        {shown.editor && (
          <ItemDialogBody
            key={shown.key}
            trip={trip}
            items={items}
            editor={shown.editor}
            onClose={requestClose}
            onSaved={(item, added) => {
              dirty.current = false;
              onSaved(item, added);
            }}
            onDirtyChange={setDirty}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const TYPES: { type: ItemType; Icon: typeof Plane; hint: string }[] = [
  { type: "flight", Icon: Plane, hint: "Departure and arrival, in their own time zones" },
  { type: "stay", Icon: BedDouble, hint: "Hotel, inn or rental, with check-in and check-out" },
  { type: "activity", Icon: MapPin, hint: "Sights, restaurants, trains and everything else" },
];

type BodyProps = Omit<Props, "editor"> & { editor: ItemEditor; onDirtyChange: (dirty: boolean) => void };

function ItemDialogBody({ trip, items, editor, onClose, onSaved, onDirtyChange }: BodyProps) {
  const editing = editor.mode === "edit" ? editor.item : undefined;
  const [type, setType] = useState<ItemType | null>(editing?.type ?? null);
  // What was typed before "Change type", carried into the next type's form along with whether it was changed.
  const [carried, setCarried] = useState<{ values: ItemFormValues; dirty: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);
  const reportDirty = useCallback(
    (formDirty: boolean) => {
      setDirty(formDirty);
      onDirtyChange(formDirty || (carried?.dirty ?? false));
    },
    [onDirtyChange, carried],
  );
  const create = useCreateItem(trip.id);
  const update = useUpdateItem(trip.id);

  if (type === null) {
    return (
      <>
        <div className="flex flex-col gap-1">
          <DialogTitle>Add to trip</DialogTitle>
          {editor.mode === "add" && <DialogDescription>What are you adding on {formatDay(editor.day)}?</DialogDescription>}
        </div>
        <ul className="flex flex-col gap-2">
          {TYPES.map(({ type: t, Icon, hint }) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => setType(t)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="flex flex-col">
                  <span className="font-medium">{TYPE_LABEL[t]}</span>
                  <span className="text-sm text-muted-foreground">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button variant="outline" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </>
    );
  }

  const fallbackZone = browserTimeZone();
  const defaults: ItemFormValues =
    editor.mode === "edit"
      ? itemToForm(editor.item, fallbackZone)
      : carried
        ? { ...carried.values, type }
        : emptyItemForm(type, editor.day, defaultTimeZone(items, editor.day, fallbackZone));

  const save = async (values: ItemFormValues) => {
    const draft = formToItem(values, trip.id, editing);
    const position = placeItem(draft, items, editing);
    const saved = editing
      ? await update.mutateAsync({ id: editing.id, patch: { ...draft, position } })
      : await create.mutateAsync({ ...draft, position });
    onSaved(saved, !editing);
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <DialogTitle>{editing ? `Edit “${editing.title}”` : `Add ${TYPE_LABEL[type].toLowerCase()}`}</DialogTitle>
        <DialogDescription>
          {editing ? "Change any details and save." : "Add a name and when it happens. Everything else is optional."}
        </DialogDescription>
      </div>
      <ItemForm
        trip={trip}
        defaultValues={defaults}
        submitLabel={editing ? "Save changes" : `Add ${TYPE_LABEL[type].toLowerCase()}`}
        onSubmit={save}
        onCancel={onClose}
        onDirtyChange={reportDirty}
        onChangeType={
          editing
            ? undefined
            : (values) => {
                setCarried({ values, dirty: dirty || (carried?.dirty ?? false) });
                setType(null);
              }
        }
      />
    </>
  );
}
