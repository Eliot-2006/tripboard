import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { dayColor, dayTextColor } from "@/lib/map/colors";
import { dayDiff, formatDay } from "@/lib/time";
import type { Trip } from "@/types";

/** Side padding shared by every full-width band, growing with the screen. */
export const GUTTER = "px-4 sm:px-6 lg:px-8 2xl:px-12";

type Props = { trip: Trip; days: string[]; onAdd: () => void; onEdit: () => void; /** Links above the name, e.g. back to all trips. */ nav?: ReactNode };

/** The black band of a subway sign: trip name, dates, and a strip map of the days in view that jumps to each one. */
export function TripHeader({ trip, days, onAdd, onEdit, nav }: Props) {
  const length = dayDiff(trip.start_date, trip.end_date) + 1;
  const facts = [
    `${formatDay(trip.start_date)} to ${formatDay(trip.end_date)}`,
    `${length} ${length === 1 ? "day" : "days"}`,
    ...(trip.destinations.length > 0 ? [trip.destinations.join(", ")] : []),
  ];
  return (
    <header className="bg-signage text-signage-foreground">
      {nav && <div className={cn("flex min-h-14 items-center justify-between gap-4 pt-2", GUTTER)}>{nav}</div>}
      <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pt-4 pb-3 sm:gap-y-4 sm:pt-6 sm:pb-5", GUTTER)}>
        <div className="min-w-0">
          <h1 className="text-3xl leading-none font-semibold tracking-tight break-words font-stretch-condensed sm:text-5xl">
            {trip.name}
          </h1>
          <p className="mt-2 text-sm text-signage-muted tabular-nums">{facts.join(" · ")}</p>
        </div>
        <div className="flex gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
          <Button
            variant="outline"
            className="min-h-11 border-signage-foreground/30 bg-transparent px-4 text-signage-foreground hover:bg-signage-foreground/10 hover:text-signage-foreground"
            onClick={onEdit}
          >
            Edit trip
          </Button>
          <Button className="min-h-11 bg-signage-foreground px-4 text-signage hover:bg-signage-foreground/85" onClick={onAdd}>
            Add to trip
          </Button>
        </div>
      </div>

      {/* Below sm the strip can overflow, so its end fades out to show there are more days to scroll to. */}
      <nav
        aria-label="Days"
        className={cn("overflow-x-auto pb-3 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] sm:pb-5", GUTTER)}
      >
        <ol className="flex w-max min-w-full items-center">
          {days.map((day) => {
            const i = dayDiff(trip.start_date, day);
            return (
              // Each day's segment runs in its own ink to the next bullet, like the strip map over a train door.
              <li key={day} className="group flex flex-1 items-center last:flex-none">
                <a
                  href={`#day-${day}`}
                  aria-label={`Day ${i + 1} · ${formatDay(day)}`}
                  className="flex size-11 items-center justify-center rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-signage-foreground"
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ring-2 ring-signage transition-transform hover:scale-110"
                    style={{ backgroundColor: dayColor(i), color: dayTextColor(i) }}
                  >
                    {i + 1}
                  </span>
                </a>
                <span aria-hidden className="-mx-1.5 h-1 min-w-4 flex-1 group-last:hidden" style={{ backgroundColor: dayColor(i) }} />
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}
