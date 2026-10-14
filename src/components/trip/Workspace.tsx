"use client";

import { useState } from "react";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import { DateRangeControl } from "@/components/itinerary/DateRangeControl";
import { DeleteItemDialog } from "@/components/itinerary/DeleteItemDialog";
import { ItemDialog, type ItemEditor } from "@/components/itinerary/ItemDialog";
import { Itinerary } from "@/components/itinerary/Itinerary";
import { MapPanel } from "@/components/map/MapPanel";
import { GUTTER, TripHeader } from "@/components/trip/TripHeader";
import { Button } from "@/components/ui/button";
import { useItems, useTrip } from "@/lib/data/hooks";
import { visibleItems } from "@/lib/ordering";
import { daysBetween } from "@/lib/time";
import { cn } from "cn";
import type { Item } from "@/types";

export type Range = { start: string; end: string } | null;

export function Workspace({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const items = useItems(tripId);
  const [range, setRawRange] = useState<Range>(null);
  const [selectedId, select] = useState<string | null>(null);
  const [view, setView] = useState<"itinerary" | "map">("itinerary");
  const [editor, setEditor] = useState<ItemEditor | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  // Read out by screen readers after an add, edit or delete (the list changes silently otherwise).
  const [announcement, setAnnouncement] = useState("");

  // An inverted range is swapped, not emptied. A selection the new range hides is dropped, so widening the
  // range later doesn't reopen it unasked.
  const setRange = (r: Range) => {
    const next = r && r.start > r.end ? { start: r.end, end: r.start } : r;
    setRawRange(next);
    const day = items.data?.find((i) => i.id === selectedId)?.day;
    if (next && day && (day < next.start || day > next.end)) select(null);
  };

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
    <div className="flex flex-1 flex-col">
      <TripHeader trip={t} days={days} onAdd={() => setEditor({ mode: "add", day: effective.start })} />
      <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b py-5", GUTTER)}>
        {/* Budget counts every item in the trip, not just the visible range (PRD 4.6). */}
        <BudgetSummary items={all} totalBudget={t.total_budget} currency={t.currency} className="min-w-0 flex-1 basis-[28rem]" />
        <DateRangeControl trip={t} range={range} onChange={setRange} />
      </div>

      <div role="group" aria-label="View" className={cn("flex gap-2 pt-4 lg:hidden", GUTTER)}>
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

      {/* Edge to edge: the map takes the larger share as the screen widens, and stays in view while the days scroll. */}
      <div className="grid flex-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          aria-label="Itinerary"
          className={cn("py-6 lg:border-r", GUTTER, view === "map" && "hidden lg:block")}
        >
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
        <section
          aria-label="Map"
          className={cn("py-6 lg:sticky lg:top-0 lg:h-dvh", GUTTER, view === "itinerary" && "hidden lg:block")}
        >
          <MapPanel items={visible} days={days} tripStart={t.start_date} selectedId={selectedId} />
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
