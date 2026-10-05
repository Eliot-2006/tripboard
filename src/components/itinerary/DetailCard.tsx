import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/budget";
import { formatDateTime } from "@/lib/time";
import type { Item } from "@/types";
import { locationLabel, PAYMENT_LABEL, STATUS_LABEL, TYPE_LABEL } from "./labels";

type Props = { item: Item; currency: string; onClose: () => void };

export function DetailCard({ item, currency, onClose }: Props) {
  const startTz = item.start_timezone ?? "UTC";
  const money = (n: number | null) => (n === null ? null : formatMoney(n, currency));
  const rows: [string, string | null][] = [
    ["Type", TYPE_LABEL[item.type]],
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
    <section aria-label="Item details" className="rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{item.title}</h2>
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
    </section>
  );
}
