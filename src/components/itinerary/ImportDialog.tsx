"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateItem } from "@/lib/data/hooks";
import { findDuplicate } from "@/lib/import/duplicates";
import { MAX_UPLOAD_BYTES } from "@/lib/import/file";
import { draftsToForms, fillZones } from "@/lib/import/map";
import type { Draft } from "@/lib/import/schema";
import { defaultTimeZone, formToItem, itemFormSchema, placeItem, type ItemFormValues } from "@/lib/items/form";
import { browserTimeZone, formatDay, formatDayWithYear } from "@/lib/time";
import type { Item, Trip } from "@/types";
import { ItemForm } from "./ItemForm";
import { TYPE_LABEL } from "./labels";

type Props = {
  trip: Trip;
  items: Item[];
  open: boolean;
  onClose: () => void;
  /** Called once the confirmed drafts are saved, with how many were added. */
  onImported: (count: number) => void;
};

export function ImportDialog({ trip, items, open, onClose, onImported }: Props) {
  // Each opening starts from the file picker, even if it reopens before the closing animation ends.
  const [wasOpen, setWasOpen] = useState(open);
  const [key, setKey] = useState(0);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setKey(key + 1);
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <ImportBody key={key} trip={trip} items={items} onClose={onClose} onImported={onImported} />
      </DialogContent>
    </Dialog>
  );
}

type DraftState = { id: number; values: ItemFormValues };
type Stage = "pick" | "reading" | "review";

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp";

function ImportBody({ trip, items, onClose, onImported }: Omit<Props, "open">) {
  const uid = useId();
  const [stage, setStage] = useState<Stage>("pick");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftState[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const create = useCreateItem(trip.id);
  const schema = itemFormSchema(trip);

  // Moves focus to the review heading once the drafts appear, so screen readers announce where they landed.
  useEffect(() => {
    if (stage === "review") heading.current?.focus();
  }, [stage]);

  const read = async (file: File) => {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That file is over 5 MB. Try a smaller PDF or a cropped screenshot.");
      return;
    }
    setStage("reading");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { items?: Draft[]; error?: string } | null;
      if (!res.ok || !json?.items) throw new Error(json?.error ?? "We couldn't read that file. Please try again.");
      const zone = browserTimeZone();
      const next = draftsToForms(json.items, trip).map((v, id) => ({
        id,
        values: v.is_flexible ? v : fillZones(v, defaultTimeZone(items, v.start_date, zone)),
      }));
      setDrafts(next);
      setSelected(new Set(next.filter((d) => schema.safeParse(d.values).success && !findDuplicate(d.values, items)).map((d) => d.id)));
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read that file. Please try again.");
      setStage("pick");
    }
  };

  const confirm = async () => {
    setSaving(true);
    setError(null);
    // Each saved item joins the list, so the next one is placed among it by start time.
    const placed = [...items];
    const left = [...drafts];
    let added = 0;
    let failed = false;
    for (const d of drafts.filter((d) => selected.has(d.id))) {
      try {
        const draft = formToItem(d.values, trip.id);
        const saved = await create.mutateAsync({ ...draft, position: placeItem(draft, placed) });
        placed.push(saved);
        left.splice(left.indexOf(d), 1);
        added++;
      } catch {
        setError(`We couldn't add “${d.values.title}”. Nothing is lost: fix the problem or try again.`);
        failed = true;
        break;
      }
    }
    setSaving(false);
    if (added > 0) onImported(added);
    if (!failed) return onClose();
    // Keep what did not get saved, so it can be retried.
    setDrafts(left);
    setSelected((s) => new Set([...s].filter((id) => left.some((d) => d.id === id))));
  };

  if (stage === "pick" || stage === "reading") {
    const reading = stage === "reading";
    return (
      <>
        <div className="flex flex-col gap-1">
          <DialogTitle>Import a booking</DialogTitle>
          <DialogDescription>
            Choose a PDF or a screenshot of a confirmation (up to 5 MB). You review everything before it is added, and the file
            is not kept.
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-file`}>Booking file (PDF, PNG, JPEG or WebP)</Label>
          <Input
            id={`${uid}-file`}
            type="file"
            accept={ACCEPT}
            disabled={reading}
            aria-describedby={error ? `${uid}-error` : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void read(file);
            }}
          />
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {reading ? "Reading your file. This can take up to a minute…" : ""}
        </p>
        {error && (
          <p id={`${uid}-error`} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="outline" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </>
    );
  }

  const count = selected.size;
  return (
    <>
      <div className="flex flex-col gap-1">
        <DialogTitle ref={heading} tabIndex={-1} className="outline-none">
          {drafts.length === 0 ? "No bookings found" : `Review ${drafts.length} ${drafts.length === 1 ? "booking" : "bookings"}`}
        </DialogTitle>
        <DialogDescription>
          {drafts.length === 0
            ? "We couldn't find a flight, stay or activity in that file. You can add it by hand instead."
            : "Check the details, edit anything that's off, and choose which to add. Please check times and prices against your document."}
        </DialogDescription>
      </div>
      <ul className="flex flex-col gap-3">
        {drafts.map((d) => {
          const issue = schema.safeParse(d.values);
          const invalid = !issue.success;
          const dup = findDuplicate(d.values, items);
          const v = d.values;
          const checkId = `${uid}-pick-${d.id}`;
          return (
            <li key={d.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <input
                  id={checkId}
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-primary"
                  checked={selected.has(d.id) && !invalid}
                  disabled={invalid || saving}
                  onChange={(e) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (e.target.checked) next.add(d.id);
                      else next.delete(d.id);
                      return next;
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <label htmlFor={checkId} className="block font-medium break-words">
                    {v.title || "Untitled"}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {TYPE_LABEL[v.type]} · {v.start_date ? formatDayWithYear(v.start_date) : "No date"}
                    {v.is_flexible ? "" : ` · ${v.start_time}`}
                    {v.confirmation_number && ` · ${v.confirmation_number}`}
                  </p>
                  {dup && (
                    <p className="mt-1 text-sm font-medium">
                      Looks like a duplicate of “{dup.title}” on {formatDay(dup.day)}.
                    </p>
                  )}
                  {invalid && <p className="mt-1 text-sm text-destructive">Needs a fix: {issue.error.issues[0]?.message}</p>}
                </div>
                <Button
                  variant="outline"
                  className="min-h-11 shrink-0"
                  aria-expanded={editing === d.id}
                  aria-label={`${editing === d.id ? "Close editor for" : "Edit"} ${v.title || "booking"}`}
                  disabled={saving}
                  onClick={() => setEditing(editing === d.id ? null : d.id)}
                >
                  {editing === d.id ? "Close" : "Edit"}
                </Button>
              </div>
              {editing === d.id && (
                <ItemForm
                  trip={trip}
                  defaultValues={v}
                  submitLabel="Update booking"
                  onSubmit={async (values) => {
                    setDrafts((all) => all.map((x) => (x.id === d.id ? { ...x, values } : x)));
                    // A fixed draft is ready to add, unless it still looks like a duplicate.
                    setSelected((s) => (findDuplicate(values, items) ? s : new Set(s).add(d.id)));
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">
        {saving ? "Adding bookings…" : ""}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="min-h-11" onClick={onClose} disabled={saving}>
          {drafts.length === 0 ? "Close" : "Cancel"}
        </Button>
        {drafts.length > 0 && (
          <Button className="min-h-11" onClick={confirm} disabled={count === 0 || saving}>
            {saving ? "Adding…" : `Add ${count} ${count === 1 ? "booking" : "bookings"}`}
          </Button>
        )}
      </div>
    </>
  );
}
