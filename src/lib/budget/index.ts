import type { Item } from "@/types";

export type BudgetSummary = {
  estimated: number;
  paid: number;
  remainingExpected: number;
  budgetRemaining: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const itemCost = (item: Item): number => item.actual_cost ?? item.estimated_cost ?? 0;

export function summarize(items: Item[], totalBudget: number | null): BudgetSummary {
  const counted = items.filter((i) => i.status !== "idea");
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

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
