"use client";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { daysBetween, formatDay } from "@/lib/time";
import type { Range } from "@/components/trip/Workspace";
import type { Trip } from "@/types";

export function DateRangeControl({ trip, range, onChange: setRange }: { trip: Trip; range: Range; onChange: (r: Range) => void }) {
  const days = daysBetween(trip.start_date, trip.end_date);
  const start = range?.start ?? trip.start_date;
  const end = range?.end ?? trip.end_date;
  const options = days.map((d) => (
    <option key={d} value={d}>
      {formatDay(d)}
    </option>
  ));

  return (
    <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <Button
        variant={range ? "outline" : "default"}
        aria-pressed={!range}
        className="min-h-11 px-4"
        onClick={() => setRange(null)}
      >
        Whole trip
      </Button>
      {/* The two days stay on one line, sharing the width on phones. */}
      <div className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto">
        <span aria-hidden className="text-muted-foreground">
          From
        </span>
        <NativeSelect
          aria-label="From day"
          className="w-auto min-w-0 flex-1 tabular-nums"
          value={start}
          onChange={(e) => setRange({ start: e.target.value, end })}
        >
          {options}
        </NativeSelect>
        <span aria-hidden className="text-muted-foreground">
          to
        </span>
        <NativeSelect
          aria-label="To day"
          className="w-auto min-w-0 flex-1 tabular-nums"
          value={end}
          onChange={(e) => setRange({ start, end: e.target.value })}
        >
          {options}
        </NativeSelect>
      </div>
    </div>
  );
}
