"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { dayColor, dayTextColor } from "@/lib/map/colors";
import { dayDiff, formatDay } from "@/lib/time";
import type { Item } from "@/types";
import { DetailCard } from "./DetailCard";
import { ItemCard } from "./ItemCard";

type Props = {
  tripStart: string;
  days: string[];
  items: Item[];
  currency: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (day: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
};

/** One segment of a day's line. It runs through the 1.75rem marker column (center at 14px, 4px wide). */
const segment = "pointer-events-none absolute left-3 z-10 w-1 bg-(--line)";

export function Itinerary({ tripStart, days, items, currency, selectedId, onSelect, onAdd, onEdit, onDelete }: Props) {
  const selectedCard = useRef<HTMLButtonElement>(null);
  // Bring a newly selected item and its details on screen, e.g. right after it is added or moved to another day.
  useEffect(() => {
    selectedCard.current?.closest("li")?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);
  // Closing unmounts the focused Close button, so hand focus back to the card that opened it.
  const close = () => {
    selectedCard.current?.focus();
    onSelect(null);
  };

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => {
        const dayIndex = dayDiff(tripStart, day);
        const dayItems = items.filter((i) => i.day === day);
        return (
          <section
            key={day}
            aria-labelledby={`day-${day}`}
            className="scroll-mt-4"
            style={{ "--line": dayColor(dayIndex) } as CSSProperties}
          >
            {/* Focusable from script only: focus lands here after an item on this day is deleted. */}
            <h2 id={`day-${day}`} tabIndex={-1} className="relative flex items-center gap-3 pb-1 outline-offset-4">
              <span
                aria-hidden
                className="relative z-20 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
                style={{ backgroundColor: dayColor(dayIndex), color: dayTextColor(dayIndex) }}
              >
                {dayIndex + 1}
              </span>
              <span className="sr-only">{`Day ${dayIndex + 1} · `}</span>
              <span className="text-xl font-semibold tracking-tight font-stretch-condensed">{formatDay(day)}</span>
              {dayItems.length > 0 && <span aria-hidden className={`${segment} top-1/2 bottom-0`} />}
            </h2>
            {dayItems.length === 0 ? (
              <div className="mt-2 ml-8 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                <span>Nothing planned yet.</span>
                <Button variant="outline" className="min-h-11 px-4" onClick={() => onAdd(day)}>
                  Add something
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col">
                {dayItems.map((item) => (
                  <li key={item.id} className="group relative flex flex-col">
                    {/* The last station ends the line at its own center. */}
                    <span aria-hidden className={`${segment} top-0 bottom-0 group-last:bottom-auto group-last:h-6`} />
                    <ItemCard
                      ref={item.id === selectedId ? selectedCard : undefined}
                      item={item}
                      currency={currency}
                      selected={item.id === selectedId}
                      onSelect={() => onSelect(item.id === selectedId ? null : item.id)}
                      detailsId={`details-${item.id}`}
                    />
                    {/* Expanded card under the selection, so it opens where the user clicked (ITIN-3). */}
                    {item.id === selectedId && (
                      <DetailCard
                        id={`details-${item.id}`}
                        item={item}
                        currency={currency}
                        onClose={close}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
