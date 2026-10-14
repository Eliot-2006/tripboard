import { BedDouble, MapPin, Plane, UtensilsCrossed } from "lucide-react";
import type { Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, itemCost } from "@/lib/budget";
import { formatItemTime } from "@/lib/time";
import { cn } from "cn";
import type { Item } from "@/types";
import { isRestaurant, kindLabel, locationLabel, STATUS_LABEL } from "./labels";

const ICONS = { flight: Plane, stay: BedDouble, activity: MapPin, restaurant: UtensilsCrossed } as const;

type Props = {
  item: Item;
  currency: string;
  selected: boolean;
  onSelect: () => void;
  /** Id of the detail region this card expands while selected. */
  detailsId: string;
  ref?: Ref<HTMLButtonElement>;
};

/**
 * A station on the day's line: marker, time, then what and where. Phones stack the time over the title; wider
 * screens give it its own timetable column. Flights are interchanges, drawn as heavier ink rings.
 */
export function ItemCard({ item, currency, selected, onSelect, detailsId, ref }: Props) {
  const Icon = ICONS[isRestaurant(item) ? "restaurant" : item.type];
  const cost = itemCost(item);
  const place = locationLabel(item);
  const flight = item.type === "flight";
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={selected}
      aria-controls={selected ? detailsId : undefined}
      onClick={onSelect}
      className={cn(
        "relative grid min-h-11 w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 rounded-md py-3 pr-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2",
        "sm:grid-cols-[1.75rem_5.5rem_minmax(0,1fr)_auto]",
        // The outline starts where the detail card below does, past the line, so the two edges align.
        selected &&
          "before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:left-8 before:rounded-md before:ring-2 before:ring-foreground before:ring-inset",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative z-20 col-start-1 row-span-2 justify-self-center rounded-full border-[3px] bg-background transition-[background-color,scale] sm:row-span-1",
          flight ? "mt-0.5 size-[18px] border-foreground" : "mt-[5px] size-3.5 border-(--line)",
          selected && "scale-125 border-foreground bg-foreground",
        )}
      />
      <span className="col-start-2 text-sm text-muted-foreground tabular-nums sm:pt-0.5">{formatItemTime(item)}</span>
      <span className="col-start-2 flex min-w-0 flex-col gap-1.5 sm:col-start-3 sm:row-start-1">
        <span className="text-[1.0625rem] leading-6 font-semibold font-stretch-condensed">{item.title}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{place ?? kindLabel(item)}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{STATUS_LABEL[item.status]}</Badge>
          {item.payment_status === "paid" && <Badge>Paid</Badge>}
        </span>
      </span>
      {cost > 0 && (
        <span className="col-start-3 row-start-1 text-sm font-semibold tabular-nums sm:col-start-4 sm:pt-0.5">
          {formatMoney(cost, currency)}
        </span>
      )}
    </button>
  );
}
