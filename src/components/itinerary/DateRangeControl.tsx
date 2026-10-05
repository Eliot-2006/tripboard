"use client";

import { Button } from "@/components/ui/button";
import { daysBetween, formatDay } from "@/lib/time";
import { useWorkspace } from "@/stores/workspace";
import type { Trip } from "@/types";

export function DateRangeControl({ trip }: { trip: Trip }) {
  const range = useWorkspace((s) => s.range);
  const setRange = useWorkspace((s) => s.setRange);
  const days = daysBetween(trip.start_date, trip.end_date);
  const start = range?.start ?? trip.start_date;
  const end = range?.end ?? trip.end_date;
  const select = "min-h-11 rounded-md border bg-background px-2";

  return (
    <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-3">
      <Button
        variant={range ? "outline" : "default"}
        aria-pressed={!range}
        className="min-h-11"
        onClick={() => setRange(null)}
      >
        Whole trip
      </Button>
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden>From</span>
        <select
          aria-label="From day"
          className={select}
          value={start}
          onChange={(e) => setRange({ start: e.target.value, end })}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {formatDay(d)}
            </option>
          ))}
        </select>
        <span aria-hidden>to</span>
        <select
          aria-label="To day"
          className={select}
          value={end}
          onChange={(e) => setRange({ start, end: e.target.value })}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {formatDay(d)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
