import { formatMoney, spendByType, summarize } from "@/lib/budget";
import { cn } from "cn";
import type { Item } from "@/types";

type Props = { items: Item[]; totalBudget: number | null; currency: string; className?: string };

export function BudgetSummary({ items, totalBudget, currency, className }: Props) {
  const s = summarize(items, totalBudget);
  const money = (n: number) => formatMoney(n, currency);
  const over = s.budgetRemaining !== null && s.budgetRemaining < 0;
  const byType = spendByType(items);
  const breakdown: [string, number][] = [
    ["Flights", byType.flight],
    ["Stays", byType.stay],
    ["Activities", byType.activity],
  ];
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
    <section aria-label="Budget summary" className={cn("flex flex-col gap-2 sm:gap-3", className)}>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg leading-tight sm:text-xl font-semibold tabular-nums font-stretch-condensed">{value}</dd>
            {over && label === "Budget remaining" && (
              <dd role="status" className="text-xs font-semibold">
                Over budget by {money(-s.budgetRemaining!)}
              </dd>
            )}
          </div>
        ))}
      </dl>
      {scale > 0 && (
        <div aria-hidden className="relative flex h-1.5 overflow-hidden rounded-full bg-secondary">
          <span className="bg-foreground" style={{ width: pct(s.paid) }} />
          <span className="bg-foreground/35" style={{ width: pct(s.remainingExpected) }} />
          {/* Over budget the bar is full, so a notch marks where the budget ends. */}
          {over && <span className="absolute inset-y-0 w-0.5 bg-background" style={{ left: pct(totalBudget!) }} />}
        </div>
      )}
      {s.estimated > 0 && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {breakdown.map(([label, amount]) => (
            <div key={label} className="flex gap-1.5">
              <dt>{label}</dt>
              <dd className="tabular-nums text-foreground">{money(amount)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
