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
    <section id={id} aria-label="Item details" className="rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <Button variant="ghost" className="min-h-11" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) =>
          value === null ? null : (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ),
        )}
      </dl>
      {!hasPin && <p className="mt-3 text-sm text-muted-foreground">No map location</p>}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="min-h-11" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="outline" className="min-h-11 text-destructive hover:text-destructive" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </section>
  );
}
