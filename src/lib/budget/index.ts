import type { Item, ItemType } from "@/types";

export type BudgetSummary = {
  estimated: number;
  paid: number;
  remainingExpected: number;
  budgetRemaining: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const itemCost = (item: Item): number => item.actual_cost ?? item.estimated_cost ?? 0;

const counts = (items: Item[]) => items.filter((i) => i.status !== "idea");

export function summarize(items: Item[], totalBudget: number | null): BudgetSummary {
  const counted = counts(items);
  const estimated = round2(counted.reduce((sum, i) => sum + itemCost(i), 0));
  const paid = round2(
    counted.filter((i) => i.payment_status === "paid").reduce((sum, i) => sum + itemCost(i), 0),
  );
  return {
    estimated,
    paid,
    remainingExpected: round2(estimated - paid),
    budgetRemaining: totalBudget === null ? null : round2(totalBudget - estimated),
  };
}

/** Estimated trip cost split by item type, counted exactly as `summarize` does. */
export function spendByType(items: Item[]): Record<ItemType, number> {
  const out: Record<ItemType, number> = { flight: 0, stay: 0, activity: 0 };
  for (const i of counts(items)) out[i.type] += itemCost(i);
  for (const t of Object.keys(out) as ItemType[]) out[t] = round2(out[t]);
  return out;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // Whole amounts stay short ($3,000); anything with cents shows both digits ($12.50).
    trailingZeroDisplay: "stripIfInteger",
  }).format(amount);
}
