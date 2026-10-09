"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { dayColor } from "@/lib/map/colors";
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
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const dayIndex = dayDiff(tripStart, day);
        const dayItems = items.filter((i) => i.day === day);
        return (
          <section key={day} aria-labelledby={`day-${day}`}>
            {/* Focusable from script only: focus lands here after an item on this day is deleted. */}
            <h2 id={`day-${day}`} tabIndex={-1} className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: dayColor(dayIndex) }} />
              {`Day ${dayIndex + 1} · ${formatDay(day)}`}
            </h2>
            {dayItems.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <span>Nothing planned yet.</span>
                <Button variant="outline" className="min-h-11" onClick={() => onAdd(day)}>
                  Add something
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayItems.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2">
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
