import { BedDouble, MapPin, Plane, UtensilsCrossed } from "lucide-react";
import type { Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, itemCost } from "@/lib/budget";
import { formatItemTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Item } from "@/types";
import { locationLabel, STATUS_LABEL } from "./labels";

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

export function ItemCard({ item, currency, selected, onSelect, detailsId, ref }: Props) {
  const Icon = ICONS[item.type === "activity" && item.metadata.category === "restaurant" ? "restaurant" : item.type];
  const cost = itemCost(item);
  const place = locationLabel(item);
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={selected}
      aria-controls={selected ? detailsId : undefined}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // A border, not a fill, marks the selection: grey fills hid the badges and lowered text contrast.
        selected && "border-primary ring-1 ring-primary hover:bg-background",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">{item.title}</span>
        <span className="text-sm text-muted-foreground">
          {formatItemTime(item)}
          {place && ` · ${place}`}
        </span>
        <span className="flex flex-wrap gap-2">
          <Badge variant="secondary">{STATUS_LABEL[item.status]}</Badge>
          {item.payment_status === "paid" && <Badge>Paid</Badge>}
        </span>
      </span>
      {cost > 0 && <span className="text-sm font-medium">{formatMoney(cost, currency)}</span>}
    </button>
  );
}
