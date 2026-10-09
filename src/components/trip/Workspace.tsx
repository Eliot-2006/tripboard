"use client";

import { useEffect, useState } from "react";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import { DateRangeControl } from "@/components/itinerary/DateRangeControl";
import { DeleteItemDialog } from "@/components/itinerary/DeleteItemDialog";
import { ItemDialog, type ItemEditor } from "@/components/itinerary/ItemDialog";
import { Itinerary } from "@/components/itinerary/Itinerary";
import { LazyMap } from "@/components/map/LazyMap";
import { TripHeader } from "@/components/trip/TripHeader";
import { Button } from "@/components/ui/button";
import { useItems, useTrip } from "@/lib/data/hooks";
import { visibleItems } from "@/lib/ordering";
import { daysBetween } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/stores/workspace";
import type { Item } from "@/types";

export function Workspace({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const items = useItems(tripId);
  const range = useWorkspace((s) => s.range);
  const selectedId = useWorkspace((s) => s.selectedItemId);
  const select = useWorkspace((s) => s.select);
  const setRange = useWorkspace((s) => s.setRange);
  const [view, setView] = useState<"itinerary" | "map">("itinerary");
  const [editor, setEditor] = useState<ItemEditor | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  // Read out by screen readers after an add, edit or delete (the list changes silently otherwise).
  const [announcement, setAnnouncement] = useState("");

  // Drop a selection the date range hides, so widening the range later doesn't reopen it unasked.
  const selectedItem = items.data?.find((i) => i.id === selectedId);
  const tripRange = trip.data ? (range ?? { start: trip.data.start_date, end: trip.data.end_date }) : null;
  const selectionHidden =
    selectedItem !== undefined && tripRange !== null && visibleItems([selectedItem], tripRange).length === 0;
  useEffect(() => {
    if (selectionHidden) select(null);
  }, [selectionHidden, select]);

  if (trip.isPending || items.isPending) return <p role="status" className="p-6">Loading trip…</p>;
  if (trip.isError || items.isError) {
    return (
      <p role="alert" className="p-6">
        We couldn&apos;t load this trip. Please try again.
      </p>
    );
  }
  if (!trip.data) return <p role="alert" className="p-6">Trip not found.</p>;

  const { data: t } = trip;
  const all = items.data;
  const effective = range ?? { start: t.start_date, end: t.end_date };
  const visible = visibleItems(all, effective);
  const days = daysBetween(effective.start, effective.end);

  // Show what was just saved: select it, and widen the range or leave the map view if they would hide it.
  const showSaved = (item: Item, added: boolean) => {
    setEditor(null);
    setAnnouncement(`${added ? "Added" : "Saved"} “${item.title}”`);
    if (item.day < effective.start || item.day > effective.end) setRange(null);
    setView("itinerary");
    select(item.id);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
      <TripHeader trip={t} onAdd={() => setEditor({ mode: "add", day: effective.start })} />
      {/* Budget counts every item in the trip, not just the visible range (PRD 4.6). */}
      <BudgetSummary items={all} totalBudget={t.total_budget} currency={t.currency} />
      <DateRangeControl trip={t} />

      <div role="group" aria-label="View" className="flex gap-2 lg:hidden">
        {(["itinerary", "map"] as const).map((v) => (
          <Button
            key={v}
            variant={view === v ? "default" : "outline"}
            aria-pressed={view === v}
            className="min-h-11 flex-1 capitalize"
            onClick={() => setView(v)}
          >
            {v}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Itinerary" className={cn("flex flex-col gap-4", view === "map" && "hidden lg:flex")}>
          <Itinerary
            tripStart={t.start_date}
            days={days}
            items={visible}
            currency={t.currency}
            selectedId={selectedId}
            onSelect={select}
            onAdd={(day) => setEditor({ mode: "add", day })}
            onEdit={(item) => setEditor({ mode: "edit", item })}
            onDelete={setDeleting}
          />
        </section>
        <section aria-label="Map" className={cn(view === "itinerary" && "hidden lg:block")}>
          <LazyMap items={visible} />
        </section>
      </div>

      <ItemDialog trip={t} items={all} editor={editor} onClose={() => setEditor(null)} onSaved={showSaved} />
      <DeleteItemDialog
        tripId={t.id}
        item={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(item) => {
          setDeleting(null);
          select(null);
          setAnnouncement(`Deleted “${item.title}”`);
        }}
        afterDeleteFocus={(item) => document.getElementById(`day-${item.day}`)}
      />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
