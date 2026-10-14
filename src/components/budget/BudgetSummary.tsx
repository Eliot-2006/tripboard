import { formatMoney, summarize } from "@/lib/budget";
import { cn } from "cn";
import type { Item } from "@/types";

type Props = { items: Item[]; totalBudget: number | null; currency: string; className?: string };

export function BudgetSummary({ items, totalBudget, currency, className }: Props) {
  const s = summarize(items, totalBudget);
  const money = (n: number) => formatMoney(n, currency);
  const rows: [string, string][] = [
    ["Estimated cost", money(s.estimated)],
    ["Paid", money(s.paid)],
    ["Remaining to pay", money(s.remainingExpected)],
  ];
  if (totalBudget !== null) rows.unshift(["Total budget", money(totalBudget)]);
  if (s.budgetRemaining !== null) rows.push(["Budget remaining", money(s.budgetRemaining)]);

  // The meter repeats the figures above it as a line: paid, then still to pay, against the whole budget.
  const scale = Math.max(totalBudget ?? 0, s.estimated);
  const pct = (n: number) => `${scale > 0 ? (n / scale) * 100 : 0}%`;

  return (
    <section aria-label="Budget summary" className={cn("flex flex-col gap-3", className)}>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl leading-tight font-semibold tabular-nums font-stretch-condensed">{value}</dd>
          </div>
        ))}
      </dl>
      {scale > 0 && (
        <div aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
          <span className="bg-foreground" style={{ width: pct(s.paid) }} />
          <span className="bg-foreground/35" style={{ width: pct(s.remainingExpected) }} />
        </div>
      )}
    </section>
  );
}
