"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import { DateRangeControl } from "@/components/itinerary/DateRangeControl";
import { DeleteItemDialog } from "@/components/itinerary/DeleteItemDialog";
import { DetailSheet } from "@/components/itinerary/DetailSheet";
import { ItemDialog, type ItemEditor } from "@/components/itinerary/ItemDialog";
import { Itinerary } from "@/components/itinerary/Itinerary";
import { LazyMap } from "@/components/map/LazyMap";
import { TripDialog, type TripEditor } from "@/components/trip/TripDialog";
import { GUTTER, TripHeader } from "@/components/trip/TripHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useItems, useMoveItem, useTrip } from "@/lib/data/hooks";
import { planMove, planMoveToDay, sortItems, stayContinuations, visibleItems, type Move } from "@/lib/ordering";
import { daysBetween, formatDay } from "@/lib/time";
import { cn } from "cn";
import type { Item } from "@/types";

export type Range = { start: string; end: string } | null;

type Props = {
  tripId: string;
  /** Links shown on the band above the trip name, e.g. back to all trips and log out. */
  nav?: ReactNode;
  /** Offers "Delete trip" when editing the trip, and runs once it is gone. */
  onTripDeleted?: () => void;
};

export function Workspace({ tripId, nav, onTripDeleted }: Props) {
  const trip = useTrip(tripId);
  const items = useItems(tripId);
  const [range, setRawRange] = useState<Range>(null);
  const [selectedId, select] = useState<string | null>(null);
  const [view, setView] = useState<"itinerary" | "map">("itinerary");
  // Same breakpoint as the two-column layout: below it, details open in a bottom sheet.
  const wide = useMediaQuery("(min-width: 1024px)");
  const [editor, setEditor] = useState<ItemEditor | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [tripEditor, setTripEditor] = useState<TripEditor | null>(null);
  // Read out by screen readers after an add, edit or delete (the list changes silently otherwise).
  const [announcement, setAnnouncement] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);
  const titleOf = (id: string) => items.data?.find((i) => i.id === id)?.title ?? "item";
  const move = useMoveItem(tripId, {
    onMoved: (m) => setAnnouncement(`Moved “${titleOf(m.id)}” to ${formatDay(m.day)}`),
    onFailed: (m) => setMoveError(`We couldn't move “${titleOf(m.id)}”, so it's back where it was. Please try again.`),
  });

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
  if (!trip.data) {
    // Also what another user's trip looks like: Row Level Security hides it entirely (AUTH-5).
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-6">
        <p>We couldn&apos;t find this trip. It may have been deleted.</p>
        <Link href="/trips" className={buttonVariants({ className: "min-h-11 px-4" })}>
          Back to your trips
        </Link>
      </div>
    );
  }

  const { data: t } = trip;
  const all = items.data;
  const effective = range ?? { start: t.start_date, end: t.end_date };
  const visible = visibleItems(all, effective);
  const days = daysBetween(effective.start, effective.end);
  const tripDays = daysBetween(t.start_date, t.end_date);
  const selectedItem = visible.find((i) => i.id === selectedId) ?? null;

  // Show what was just saved: select it, and widen the range or leave the map view if they would hide it.
  const showSaved = (item: Item, added: boolean) => {
    setEditor(null);
    setAnnouncement(`${added ? "Added" : "Saved"} “${item.title}”`);
    if (item.day < effective.start || item.day > effective.end) setRange(null);
    setView("itinerary");
    select(item.id);
  };

  // Moves show at once and are saved in the background. A failed save is rolled back and explained (ITIN-6).
  const runMove = (plan: Move) => {
    setMoveError(null);
    if (plan.day < effective.start || plan.day > effective.end) setRange(null);
    move.mutate(plan);
  };
  const moveTo = (item: Item, day: string, index: number) =>
    runMove(planMove(item.id, day, sortItems(all.filter((i) => i.day === day && i.id !== item.id)), index));

  return (
    <div className="flex flex-1 flex-col">
      <TripHeader
        trip={t}
        days={days}
        nav={nav}
        onAdd={() => setEditor({ mode: "add", day: effective.start })}
        onEdit={() => setTripEditor({ mode: "edit", trip: t, items: all })}
      />
      <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b py-5", GUTTER)}>
        {/* Budget counts every item in the trip, not just the visible range (PRD 4.6). */}
        <BudgetSummary items={all} totalBudget={t.total_budget} currency={t.currency} className="min-w-0 flex-1 basis-[28rem]" />
        <DateRangeControl trip={t} range={range} onChange={setRange} />
      </div>

      {moveError && (
        <div role="alert" className={cn("flex flex-wrap items-center justify-between gap-2 border-b bg-destructive/10 py-3 text-sm text-destructive", GUTTER)}>
          {moveError}
          <Button variant="outline" className="min-h-11 px-4" onClick={() => setMoveError(null)}>
            Dismiss
          </Button>
        </div>
      )}

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
            tripDays={tripDays}
            days={days}
            staying={stayContinuations(all, days)}
            inlineDetails={wide}
            items={visible}
            currency={t.currency}
            selectedId={selectedId}
            onSelect={select}
            onAdd={(day) => setEditor({ mode: "add", day })}
            onEdit={(item) => setEditor({ mode: "edit", item })}
            onDelete={setDeleting}
            onMove={moveTo}
            onMoveToDay={(item, day) => runMove(planMoveToDay(item, day, all))}
          />
        </section>
        <section
          aria-label="Map"
          className={cn("py-6 lg:sticky lg:top-0 lg:h-dvh", GUTTER, view === "itinerary" && "hidden lg:block")}
        >
          <LazyMap items={visible} tripStart={t.start_date} selectedId={selectedId} onSelect={select} />
        </section>
      </div>

      <DetailSheet
        item={wide ? null : selectedItem}
        currency={t.currency}
        days={tripDays}
        tripStart={t.start_date}
        onClose={() => select(null)}
        onEdit={() => selectedItem && setEditor({ mode: "edit", item: selectedItem })}
        onDelete={() => selectedItem && setDeleting(selectedItem)}
        onMoveToDay={(day) => selectedItem && runMove(planMoveToDay(selectedItem, day, all))}
      />
      <TripDialog
        editor={tripEditor}
        onClose={() => setTripEditor(null)}
        onSaved={(trip) => {
          setTripEditor(null);
          // New dates can leave the chosen range behind, so show the whole trip again.
          setRange(null);
          setAnnouncement(`Saved “${trip.name}”`);
        }}
        onDeleted={onTripDeleted}
      />
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
