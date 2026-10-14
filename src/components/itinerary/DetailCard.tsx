import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/budget";
import { formatDateTime } from "@/lib/time";
import type { Item } from "@/types";
import { kindLabel, locationLabel, PAYMENT_LABEL, STATUS_LABEL } from "./labels";

type Props = {
  id: string;
  item: Item;
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DetailCard({ id, item, currency, onClose, onEdit, onDelete }: Props) {
  const startTz = item.start_timezone ?? "UTC";
  const money = (n: number | null) => (n === null ? null : formatMoney(n, currency));
  const rows: [string, string | null][] = [
    ["Type", kindLabel(item)],
    ["Starts", item.is_flexible || !item.start_at ? "Anytime" : formatDateTime(item.start_at, startTz)],
    ["Ends", item.end_at ? formatDateTime(item.end_at, item.end_timezone ?? startTz) : null],
    ["Location", locationLabel(item)],
    ["Address", item.start_address],
    ["Estimated cost", money(item.estimated_cost)],
    ["Actual cost", money(item.actual_cost)],
    ["Booking", STATUS_LABEL[item.status]],
    ["Payment", PAYMENT_LABEL[item.payment_status]],
    ["Confirmation", item.confirmation_number],
    ["Notes", item.notes],
  ];
  const hasPin = item.start_lat !== null && item.start_lng !== null;

  return (
    <section id={id} aria-label="Item details" className="mt-1 mb-3 ml-8 rounded-md border bg-background">
      <div className="flex items-start justify-between gap-2 border-b py-2 pr-2 pl-4">
        <h3 className="pt-2.5 text-lg leading-6 font-semibold font-stretch-condensed">{item.title}</h3>
        <Button variant="ghost" className="min-h-11 px-3" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-4 py-4 text-sm">
        {rows.map(([label, value]) =>
          value === null ? null : (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ),
        )}
      </dl>
      {!hasPin && <p className="px-4 pb-4 text-sm text-muted-foreground">No map location</p>}
      {/* Delete sits at the far end, away from Edit, so it is never hit by accident. */}
      <div className="flex gap-2 border-t px-4 py-3">
        <Button variant="outline" className="min-h-11 px-4" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" className="ml-auto min-h-11 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </section>
  );
}
