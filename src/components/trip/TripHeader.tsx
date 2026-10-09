import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/time";
import type { Trip } from "@/types";

type Props = { trip: Trip; onAdd: () => void };

export function TripHeader({ trip, onAdd }: Props) {
  const places = trip.destinations.length > 0 ? ` · ${trip.destinations.join(", ")}` : "";
  return (
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className="text-2xl font-semibold">{trip.name}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDay(trip.start_date)} to {formatDay(trip.end_date)}
          {places}
        </p>
      </div>
      <div className="flex gap-2">
        {/* Editing trips arrives with accounts (TRIP-3). */}
        <Button variant="outline" className="min-h-11" disabled>
          Edit
        </Button>
        <Button className="min-h-11" onClick={onAdd}>
          Add to trip
        </Button>
      </div>
    </header>
  );
}
