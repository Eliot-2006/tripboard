"use client";

import { useState } from "react";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import { DateRangeControl } from "@/components/itinerary/DateRangeControl";
import { DetailCard } from "@/components/itinerary/DetailCard";
import { Itinerary } from "@/components/itinerary/Itinerary";
import { LazyMap } from "@/components/map/LazyMap";
import { TripHeader } from "@/components/trip/TripHeader";
import { Button } from "@/components/ui/button";
import { useItems, useTrip } from "@/lib/data/hooks";
import { visibleItems } from "@/lib/ordering";
import { daysBetween } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/stores/workspace";

export function Workspace({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const items = useItems(tripId);
  const range = useWorkspace((s) => s.range);
  const selectedId = useWorkspace((s) => s.selectedItemId);
  const select = useWorkspace((s) => s.select);
  const [view, setView] = useState<"itinerary" | "map">("itinerary");

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
  const selected = all.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
      <TripHeader trip={t} />
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
          {selected && <DetailCard item={selected} currency={t.currency} onClose={() => select(null)} />}
          <Itinerary
            tripStart={t.start_date}
            days={days}
            items={visible}
            currency={t.currency}
            selectedId={selectedId}
            onSelect={select}
          />
        </section>
        <section aria-label="Map" className={cn(view === "itinerary" && "hidden lg:block")}>
          <LazyMap items={visible} />
        </section>
      </div>
    </div>
  );
}
