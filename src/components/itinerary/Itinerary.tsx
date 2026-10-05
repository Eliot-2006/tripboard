import { dayColor } from "@/lib/map/colors";
import { dayDiff, formatDay } from "@/lib/time";
import type { Item } from "@/types";
import { ItemCard } from "./ItemCard";

type Props = {
  tripStart: string;
  days: string[];
  items: Item[];
  currency: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function Itinerary({ tripStart, days, items, currency, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const dayIndex = dayDiff(tripStart, day);
        const dayItems = items.filter((i) => i.day === day);
        return (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: dayColor(dayIndex) }} />
              {`Day ${dayIndex + 1} · ${formatDay(day)}`}
            </h2>
            {dayItems.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nothing planned yet. Add something.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayItems.map((item) => (
                  <li key={item.id}>
                    <ItemCard
                      item={item}
                      currency={currency}
                      selected={item.id === selectedId}
                      onSelect={() => onSelect(item.id)}
                    />
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
