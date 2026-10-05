import { formatMoney, summarize } from "@/lib/budget";
import type { Item } from "@/types";

type Props = { items: Item[]; totalBudget: number | null; currency: string };

export function BudgetSummary({ items, totalBudget, currency }: Props) {
  const s = summarize(items, totalBudget);
  const money = (n: number) => formatMoney(n, currency);
  const rows: [string, string][] = [
    ["Estimated cost", money(s.estimated)],
    ["Paid", money(s.paid)],
    ["Remaining to pay", money(s.remainingExpected)],
  ];
  if (totalBudget !== null) rows.unshift(["Total budget", money(totalBudget)]);
  if (s.budgetRemaining !== null) rows.push(["Budget remaining", money(s.budgetRemaining)]);

  return (
    <section aria-label="Budget summary" className="rounded-lg border p-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
