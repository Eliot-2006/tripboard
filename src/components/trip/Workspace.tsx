"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import { DateRangeControl } from "@/components/itinerary/DateRangeControl";
import { DeleteItemDialog } from "@/components/itinerary/DeleteItemDialog";
import { DetailSheet } from "@/components/itinerary/DetailSheet";
import { ImportDialog } from "@/components/itinerary/ImportDialog";
import { ItemDialog, type ItemEditor } from "@/components/itinerary/ItemDialog";
import { Itinerary } from "@/components/itinerary/Itinerary";
import { LazyMap } from "@/components/map/LazyMap";
import { ShareDialog } from "@/components/trip/ShareDialog";
import { TripDialog, type TripEditor } from "@/components/trip/TripDialog";
import { GUTTER, TripHeader } from "@/components/trip/TripHeader";
import { TripLoading, TripMessage } from "@/components/trip/WorkspaceState";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCreateItem, useItems, useMoveItem, useTrip } from "@/lib/data/hooks";
import { duplicateOf, planMove, planMoveToDay, sortItems, stayContinuations, visibleItems, type Move } from "@/lib/ordering";
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
  /** Offers "Share" for a read-only link. Left out where the trip can't be shared, such as the demo. */
  canShare?: boolean;
  /** Offers "Import booking" (reads a PDF or screenshot on the server). Only set when the server has an API key. */
  canImport?: boolean;
  /** A shared view: nothing can be added, edited, moved or deleted, and the budget stays hidden. */
  readOnly?: boolean;
};

export function Workspace({ tripId, nav, onTripDeleted, canShare, canImport, readOnly }: Props) {
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
  const [sharing, setSharing] = useState(false);
  const [importing, setImporting] = useState(false);
  // Read out by screen readers after an add, edit or delete (the list changes silently otherwise).
  const [announcement, setAnnouncement] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);
  const titleOf = (id: string) => items.data?.find((i) => i.id === id)?.title ?? "item";
  const move = useMoveItem(tripId, {
    onMoved: (m) => setAnnouncement(`Moved “${titleOf(m.id)}” to ${formatDay(m.day)}`),
    onFailed: (m) => setMoveError(`We couldn't move “${titleOf(m.id)}”, so it's back where it was. Please try again.`),
  });

  const create = useCreateItem(tripId);
  const duplicating = useRef(false);

  // An inverted range is swapped, not emptied. A selection the new range hides is dropped, so widening the
  // range later doesn't reopen it unasked.
  const setRange = (r: Range) => {
    const next = r && r.start > r.end ? { start: r.end, end: r.start } : r;
    setRawRange(next);
    const day = items.data?.find((i) => i.id === selectedId)?.day;
    if (next && day && (day < next.start || day > next.end)) select(null);
  };

  if (trip.isPending || items.isPending) return <TripLoading />;
  if (trip.isError || items.isError) {
    return (
      <TripMessage title="We couldn't load this trip">
        <p className="text-muted-foreground">Check your connection and try again. Your trip is safe.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11 px-4"
            onClick={() => {
              void trip.refetch();
              void items.refetch();
            }}
          >
            Try again
          </Button>
          {/* NFR-6: if the database is down, the demo still works. */}
          <Link href="/demo" className={buttonVariants({ variant: "outline", className: "min-h-11 px-4" })}>
            Try the demo
          </Link>
        </div>
      </TripMessage>
    );
  }
  if (!trip.data) {
    // Also what another user's trip looks like: Row Level Security hides it entirely (AUTH-5).
    return (
      <TripMessage title="We couldn't find this trip">
        <p className="text-muted-foreground">It may have been deleted.</p>
        <Link href="/trips" className={buttonVariants({ className: "min-h-11 px-4" })}>
          Back to your trips
        </Link>
      </TripMessage>
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

  // The copy lands right after the original on the same day, so it is always in range.
  const duplicate = async (item: Item) => {
    if (duplicating.current) return null;
    duplicating.current = true;
    setMoveError(null);
    try {
      const copy = await create.mutateAsync(duplicateOf(item, all.filter((i) => i.day === item.day)));
      setAnnouncement(`Duplicated “${copy.title}” on ${formatDay(copy.day)}`);
      return copy;
    } catch {
      setMoveError(`We couldn't duplicate “${item.title}”. Please try again.`);
      return null;
    } finally {
      duplicating.current = false;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <TripHeader
        trip={t}
        days={days}
        nav={nav}
        readOnly={readOnly}
        onShare={canShare ? () => setSharing(true) : undefined}
        onImport={canImport ? () => setImporting(true) : undefined}
        onAdd={() => setEditor({ mode: "add", day: effective.start })}
        onEdit={() => setTripEditor({ mode: "edit", trip: t, items: all })}
      />
      <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-3 border-b py-3 sm:gap-y-5 sm:py-5", GUTTER)}>
        {/* Budget counts every item in the trip, not just the visible range (PRD 4.6). */}
        {!readOnly && (
          <BudgetSummary items={all} totalBudget={t.total_budget} currency={t.currency} className="min-w-0 flex-1 basis-[28rem]" />
        )}
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

      <div role="group" aria-label="View" className={cn("flex gap-2 pt-3 lg:hidden", GUTTER)}>
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
            onDuplicate={duplicate}
            onDelete={setDeleting}
            onMove={moveTo}
            onMoveToDay={(item, day) => runMove(planMoveToDay(item, day, all))}
            readOnly={readOnly}
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
        readOnly={readOnly}
        onClose={() => select(null)}
        onEdit={() => selectedItem && setEditor({ mode: "edit", item: selectedItem })}
        onDuplicate={async () => {
          if (!selectedItem) return;
          const copy = await duplicate(selectedItem);
          if (copy) select(copy.id);
        }}
        onDelete={() => selectedItem && setDeleting(selectedItem)}
        onMoveToDay={(day) => selectedItem && runMove(planMoveToDay(selectedItem, day, all))}
      />
      {!readOnly && (
        <>
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
        {canImport && (
          <ImportDialog
            trip={t}
            items={all}
            open={importing}
            onClose={() => setImporting(false)}
            onImported={(n) => setAnnouncement(`Added ${n} ${n === 1 ? "booking" : "bookings"} from your file`)}
          />
        )}
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
          // Focus stays where the item was: its day's toggle.
          afterDeleteFocus={(item) => document.getElementById(`day-${item.day}`)?.querySelector("button") ?? null}
        />
        </>
      )}
      {canShare && <ShareDialog trip={t} open={sharing} onClose={() => setSharing(false)} />}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
