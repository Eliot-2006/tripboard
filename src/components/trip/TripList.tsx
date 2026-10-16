"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";
import { GUTTER } from "@/components/trip/TripHeader";
import { TripDialog, type TripEditor } from "@/components/trip/TripDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/budget";
import { useTrips } from "@/lib/data/hooks";
import { splitTrips } from "@/lib/trips/split";
import { dayDiff, formatDay, formatDayWithYear } from "@/lib/time";
import { cn } from "cn";
import type { Trip } from "@/types";

/** The signed-in user's trips as cards, with a way to start a new one (TRIP-1, TRIP-2). */
export function TripList() {
  const trips = useTrips();
  const router = useRouter();
  const [editor, setEditor] = useState<TripEditor | null>(null);
  const newTrip = (
    <Button className="min-h-11 px-4" onClick={() => setEditor({ mode: "create" })}>
      New trip
    </Button>
  );

  return (
    <div className={cn("flex flex-col gap-8 py-10", GUTTER)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight font-stretch-condensed sm:text-5xl">Your trips</h1>
        {trips.data && trips.data.length > 0 && newTrip}
      </div>

      {trips.isPending ? (
        <div role="status">
          <span className="sr-only">Loading your trips…</span>
          <ul aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex h-36 flex-col gap-3 rounded-md border p-5">
                <div className="h-7 w-2/3 rounded-full bg-secondary motion-safe:animate-pulse" />
                <div className="h-4 w-full rounded-full bg-secondary motion-safe:animate-pulse" />
                <div className="mt-auto h-4 w-24 rounded-full bg-secondary motion-safe:animate-pulse" />
              </li>
            ))}
          </ul>
        </div>
      ) : trips.isError ? (
        <div role="alert" className="flex max-w-prose flex-col items-start gap-4 rounded-md border border-dashed p-6">
          <h2 className="text-xl font-semibold font-stretch-condensed">We couldn&apos;t load your trips</h2>
          <p className="text-muted-foreground">Check your connection and try again. Your trips are safe.</p>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 px-4" onClick={() => void trips.refetch()}>
              Try again
            </Button>
            <Link href="/demo" className={buttonVariants({ variant: "outline", className: "min-h-11 px-4" })}>
              Try the demo
            </Link>
          </div>
        </div>
      ) : trips.data.length === 0 ? (
        <div className="flex max-w-prose flex-col items-start gap-4 rounded-md border border-dashed p-6">
          <h2 className="text-xl font-semibold font-stretch-condensed">No trips yet</h2>
          <p className="text-muted-foreground">
            Create a trip with its dates, then add flights, stays and activities. They&apos;ll line up day by day, with a map
            and a running budget.
          </p>
          {newTrip}
        </div>
      ) : (
        <TripGroups trips={trips.data} />
      )}

      <TripDialog editor={editor} onClose={() => setEditor(null)} onSaved={(trip) => router.push(`/trips/${trip.id}`)} />
    </div>
  );
}

function TripGroups({ trips }: { trips: Trip[] }) {
  const { upcoming, past } = splitTrips(trips, DateTime.local().toISODate()!);
  return (
    <>
      <TripGroup title="Upcoming" trips={upcoming} />
      <TripGroup title="Past" trips={past} />
    </>
  );
}

function TripGroup({ title, trips }: { title: string; trips: Trip[] }) {
  if (trips.length === 0) return null;
  return (
    <section aria-labelledby={`trips-${title}`} className="flex flex-col gap-3">
      <h2 id={`trips-${title}`} className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <li key={trip.id}>
            <TripCard trip={trip} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const length = dayDiff(trip.start_date, trip.end_date) + 1;
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="flex h-full flex-col gap-2 rounded-md border p-5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="text-2xl leading-tight font-semibold tracking-tight break-words font-stretch-condensed">{trip.name}</span>
      <span className="text-sm tabular-nums">
        {formatDay(trip.start_date)} to {formatDayWithYear(trip.end_date)} · {length} {length === 1 ? "day" : "days"}
      </span>
      {trip.destinations.length > 0 && <span className="line-clamp-2 text-sm break-words text-muted-foreground">{trip.destinations.join(", ")}</span>}
      <span className="mt-auto pt-2 text-sm text-muted-foreground tabular-nums">
        {trip.total_budget === null ? "No budget set" : `Budget ${formatMoney(trip.total_budget, trip.currency)}`}
      </span>
    </Link>
  );
}
