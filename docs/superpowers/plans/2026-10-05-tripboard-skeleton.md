# Tripboard Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running, deployable Next.js repo whose `/demo` route renders a seeded trip through the repository seam, the Zustand store and tested pure `lib/` functions.

**Architecture:** UI components call TanStack Query hooks, which call a `Repository` interface supplied by a React context. Only `DemoRepository` (in-memory, seeded from JSON) exists. Money, time, ordering and map logic are pure functions in `src/lib/`. The map is a lazy, client-only placeholder.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Zod, Luxon, Zustand, TanStack Query, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-tripboard-skeleton-design.md` (source docs: `docs/tripboard-prd.md`, `docs/tripboard-technical.md`). Read the spec before starting.

## Global Constraints

- Stack is Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Vitest, Playwright. Do not add libraries that are not in the technical document (PRD §0 rule 4). `react-hook-form`, `@dnd-kit/*`, `leaflet` and `react-leaflet` are deliberately NOT installed in the skeleton. They arrive in the milestone that uses them.
- Pure logic (budget, ordering, time, map paths) lives in `src/lib/` as pure, tested functions. Components never do date, money or ordering math.
- All data access goes through the `Repository` interface and the hooks in `src/lib/data/hooks.ts`. Components never touch `DemoRepository` directly.
- Times are stored as UTC ISO strings with an IANA time zone beside them. All conversion goes through `src/lib/time/index.ts`.
- Zod validates every write. The `payment_status = paid ⇒ status = reserved` rule and `end_at >= start_at` live in the schema.
- No hardcoded colors or spacing outside Tailwind and shadcn/ui. The one exception is the 8 map day colors in `src/lib/map/colors.ts`, because Leaflet needs hex values.
- Do not rely on color alone: status and paid are text badges, days have number labels. Tap targets are at least 44px (`min-h-11`).
- Every data view has loading, empty and error states.
- No secrets in the repo. `.env.example` has empty values only.
- Out of scope: Supabase client code, `SupabaseRepository`, auth, middleware, SQL migrations, forms, drag and drop, real Leaflet map.
- Commit small and reference requirement IDs (e.g. `DEMO-1`). Add whatever commit attribution line your harness requires.

## Review Focus

Inputs the spec implies but its feature list does not exercise. Each has a test in the named task.

1. **Inverted date range** (user picks "From" later than "To"): the store swaps them instead of showing nothing. Task 9.
2. **Floating-point money** (0.1 + 0.2): budget totals round to cents. Task 4.
3. **Moving items across a DST change or moving a multi-day flight**: clock time is preserved and the arrival stays after the departure. Tasks 3 and 7.
4. **Items with no coordinates or no time** (flexible items, missing pins): the map path skips them, ordering appends them, the time label says "Anytime". Tasks 3, 5 and 6.
5. **Demo state leaking between instances or into callers**: mutations in one `DemoRepository` never touch another or the returned data. Task 7.

## File Structure

```
.env.example                          empty env keys (technical doc §8)
vitest.config.ts  playwright.config.ts
e2e/demo.spec.ts                      Playwright flows against /demo
supabase/seed/demo-trip.json          sparse seed (nulls filled by itemDefaults)
src/types/schemas.ts                  Zod schemas + business-rule refinements
src/types/defaults.ts                 itemDefaults(), SEED_STAMP
src/types/index.ts                    re-exports schemas, inferred TS types
src/test/factories.ts                 makeItem / makeNewItem / makeTrip for tests
src/lib/time/                         Luxon helpers (only place that does date math)
src/lib/budget/                       summarize, itemCost, formatMoney
src/lib/ordering/                     position math, sortItems, visibleItems
src/lib/map/                          colors.ts (done), path.ts (stubs)
src/lib/data/repository.ts            Repository interface
src/lib/data/demo-repository.ts       in-memory implementation
src/lib/data/demo-seed.ts             loads + validates seed, createDemoRepository
src/lib/data/repository.contract.ts   shared contract (Supabase impl will reuse it)
src/lib/data/provider.tsx             RepositoryProvider + useRepository
src/lib/data/hooks.ts                 TanStack Query hooks
src/stores/workspace.ts               selectedItemId + range
src/components/...                    workspace UI shells (Task 10)
src/app/...                           routes (Task 11)
```

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: Next.js scaffold (in place), `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `src/lib/smoke.test.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Produces: `@/` alias → `src/`; `npm test` runs Vitest (`src/**/*.test.ts`); `npm run e2e` runs Playwright; `cn()` from `@/lib/utils`; shadcn `Button` (`buttonVariants`) and `Badge` in `src/components/ui/`.

- [ ] **Step 1: Scaffold Next.js in the repo root**

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
If it refuses because the directory is not empty, scaffold into `../tripboard-scaffold` and copy everything except `.git` into this repo.

- [ ] **Step 2: Add shadcn/ui and the runtime dependencies**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button badge
npm install zod luxon zustand @tanstack/react-query
npm install -D vitest @types/luxon @playwright/test
npx playwright install chromium
```
If a shadcn flag has changed, check `npx shadcn@latest init --help` and keep the defaults.

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Write `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
```

- [ ] **Step 5: Add scripts, env example, gitignore exception**

In `package.json` `scripts`, add `"test": "vitest run"` and `"e2e": "playwright test"`.

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAP_TILE_URL=
```
Append `!.env.example` on its own line to `.gitignore` (the scaffold ignores `.env*`).

- [ ] **Step 6: Write the two smoke tests**

`src/lib/smoke.test.ts` (proves the `@/` alias and Vitest work):
```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("tooling", () => {
  it("resolves the @ alias", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
```

`e2e/smoke.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("home page responds", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.ok()).toBe(true);
});
```

- [ ] **Step 7: Run both**

Run: `npm test` → Expected: 1 passed.
Run: `npm run e2e` → Expected: 1 passed.

- [ ] **Step 8: Commit**

```bash
git add -A -- . ':!.DS_Store'
git commit -m "chore: scaffold Next.js, Tailwind, shadcn, Vitest, Playwright"
```
This also commits the three planning docs and `docs/`. Skip them with `git reset` first if you want them committed separately.

---

### Task 2: Types, schemas and test factories

**Files:**
- Create: `src/types/schemas.ts`, `src/types/defaults.ts`, `src/types/index.ts`, `src/test/factories.ts`
- Test: `src/types/schemas.test.ts`

**Interfaces:**
- Produces (from `@/types`): schemas `TripSchema`, `NewTripSchema`, `ItemSchema`, `NewItemSchema`, `ItemTypeSchema`, `BookingStatusSchema`, `PaymentStatusSchema`; types `Trip`, `NewTrip`, `Item`, `NewItem`, `ItemPatch` (= `Partial<NewItem>`), `ItemType`, `BookingStatus`, `PaymentStatus`.
- Produces (from `@/types/defaults`): `SEED_STAMP: string`, `itemDefaults(): Omit<NewItem, "trip_id" | "type" | "title" | "day">`.
- Produces (from `@/test/factories`): `makeTrip(over?: Partial<Trip>): Trip`, `makeItem(over?: Partial<Item>): Item`, `makeNewItem(over?: Partial<NewItem>): NewItem`.
- Field names are snake_case to match the database columns in technical doc §5, so a future Supabase repository can return rows unchanged.

- [ ] **Step 1: Write the failing test** `src/types/schemas.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { makeItem, makeTrip } from "@/test/factories";
import { ItemSchema, NewTripSchema, TripSchema } from "@/types/schemas";

describe("ItemSchema", () => {
  it("accepts a default item", () => {
    expect(ItemSchema.safeParse(makeItem()).success).toBe(true);
  });

  it("rejects paid items that are not reserved", () => {
    const r = ItemSchema.safeParse(makeItem({ status: "planned", payment_status: "paid" }));
    expect(r.success).toBe(false);
  });

  it("accepts paid items that are reserved", () => {
    const r = ItemSchema.safeParse(makeItem({ status: "reserved", payment_status: "paid" }));
    expect(r.success).toBe(true);
  });

  it("rejects end_at before start_at", () => {
    const r = ItemSchema.safeParse(
      makeItem({ start_at: "2027-04-10T10:00:00.000Z", end_at: "2027-04-10T09:00:00.000Z" }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects negative costs", () => {
    expect(ItemSchema.safeParse(makeItem({ estimated_cost: -1 })).success).toBe(false);
  });

  it("rejects unknown item types", () => {
    expect(ItemSchema.safeParse({ ...makeItem(), type: "cruise" }).success).toBe(false);
  });
});

describe("TripSchema", () => {
  it("rejects an end date before the start date, on the end_date field", () => {
    const r = TripSchema.safeParse(makeTrip({ start_date: "2027-04-10", end_date: "2027-04-09" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["end_date"]);
  });

  it("validates create input without server-set fields", () => {
    const r = NewTripSchema.safeParse({
      name: "Japan",
      start_date: "2027-04-10",
      end_date: "2027-04-18",
      destinations: [],
      currency: "USD",
      total_budget: null,
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/types` → Expected: FAIL, cannot resolve `@/test/factories`.

- [ ] **Step 3: Write `src/types/schemas.ts`**

```ts
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const money = z.number().nonnegative("Cost cannot be negative");

export const ItemTypeSchema = z.enum(["flight", "stay", "activity"]);
export const BookingStatusSchema = z.enum(["idea", "planned", "reserved"]);
export const PaymentStatusSchema = z.enum(["unpaid", "paid"]);

const TripBase = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string().min(1, "Name is required"),
  start_date: isoDate,
  end_date: isoDate,
  destinations: z.array(z.string()),
  currency: z.string().length(3),
  total_budget: money.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const endNotBeforeStart = (t: { start_date: string; end_date: string }) => t.end_date >= t.start_date;
const tripDateIssue = { message: "End date cannot be before start date", path: ["end_date"] };

export const TripSchema = TripBase.refine(endNotBeforeStart, tripDateIssue);
export const NewTripSchema = TripBase.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).refine(endNotBeforeStart, tripDateIssue);

const ItemBase = z.object({
  id: z.string(),
  trip_id: z.string(),
  type: ItemTypeSchema,
  title: z.string().min(1, "Title is required"),
  notes: z.string().nullable(),
  day: isoDate,
  is_flexible: z.boolean(),
  start_at: z.string().nullable(),
  end_at: z.string().nullable(),
  start_timezone: z.string().nullable(),
  end_timezone: z.string().nullable(),
  start_location_name: z.string().nullable(),
  start_address: z.string().nullable(),
  start_lat: z.number().nullable(),
  start_lng: z.number().nullable(),
  end_location_name: z.string().nullable(),
  end_address: z.string().nullable(),
  end_lat: z.number().nullable(),
  end_lng: z.number().nullable(),
  estimated_cost: money.nullable(),
  actual_cost: money.nullable(),
  status: BookingStatusSchema,
  payment_status: PaymentStatusSchema,
  confirmation_number: z.string().nullable(),
  position: z.number(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

type Rules = {
  status: string;
  payment_status: string;
  start_at: string | null;
  end_at: string | null;
};
const paidIsReserved = (i: Rules) => i.payment_status !== "paid" || i.status === "reserved";
const endNotBeforeStartAt = (i: Rules) =>
  !i.start_at || !i.end_at || Date.parse(i.end_at) >= Date.parse(i.start_at);
const paidIssue = { message: "A paid item must be reserved", path: ["status"] };
const timeIssue = { message: "End cannot be before start", path: ["end_at"] };

export const ItemSchema = ItemBase.refine(paidIsReserved, paidIssue).refine(endNotBeforeStartAt, timeIssue);
export const NewItemSchema = ItemBase.omit({ id: true, created_at: true, updated_at: true })
  .refine(paidIsReserved, paidIssue)
  .refine(endNotBeforeStartAt, timeIssue);
```

- [ ] **Step 4: Write `src/types/index.ts`**

```ts
import type { z } from "zod";
import type {
  BookingStatusSchema,
  ItemSchema,
  ItemTypeSchema,
  NewItemSchema,
  NewTripSchema,
  PaymentStatusSchema,
  TripSchema,
} from "./schemas";

export * from "./schemas";

export type Trip = z.infer<typeof TripSchema>;
export type NewTrip = z.infer<typeof NewTripSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type NewItem = z.infer<typeof NewItemSchema>;
export type ItemPatch = Partial<NewItem>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
```

- [ ] **Step 5: Write `src/types/defaults.ts`**

```ts
import type { NewItem } from "./index";

export const SEED_STAMP = "2026-01-01T00:00:00.000Z";

/** Every optional column null, booking planned, payment unpaid. Returns a fresh object each call. */
export function itemDefaults(): Omit<NewItem, "trip_id" | "type" | "title" | "day"> {
  return {
    notes: null,
    is_flexible: false,
    start_at: null,
    end_at: null,
    start_timezone: null,
    end_timezone: null,
    start_location_name: null,
    start_address: null,
    start_lat: null,
    start_lng: null,
    end_location_name: null,
    end_address: null,
    end_lat: null,
    end_lng: null,
    estimated_cost: null,
    actual_cost: null,
    status: "planned",
    payment_status: "unpaid",
    confirmation_number: null,
    position: 0,
    metadata: {},
  };
}
```

- [ ] **Step 6: Write `src/test/factories.ts`**

```ts
import { itemDefaults, SEED_STAMP } from "@/types/defaults";
import type { Item, NewItem, Trip } from "@/types";

export const makeTrip = (over: Partial<Trip> = {}): Trip => ({
  id: "t1",
  user_id: "u1",
  name: "Test trip",
  start_date: "2027-04-10",
  end_date: "2027-04-18",
  destinations: [],
  currency: "USD",
  total_budget: null,
  created_at: SEED_STAMP,
  updated_at: SEED_STAMP,
  ...over,
});

export const makeNewItem = (over: Partial<NewItem> = {}): NewItem => ({
  ...itemDefaults(),
  trip_id: "t1",
  type: "activity",
  title: "Item",
  day: "2027-04-10",
  ...over,
});

export const makeItem = (over: Partial<Item> = {}): Item => ({
  ...makeNewItem(),
  id: crypto.randomUUID(),
  created_at: SEED_STAMP,
  updated_at: SEED_STAMP,
  ...over,
});
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run src/types` → Expected: 8 passed.

- [ ] **Step 8: Commit**

```bash
git add src/types src/test
git commit -m "feat: Zod schemas and types for trips and items (ITEM-7, ITEM-8, TRIP-2)"
```

---

### Task 3: Time module

**Files:**
- Create: `src/lib/time/index.ts`
- Test: `src/lib/time/time.test.ts`

**Interfaces:**
- Consumes: `Item` from `@/types`; `makeItem` from `@/test/factories`.
- Produces (all from `@/lib/time`):
  - `localToUtcIso(day: string, time: string, tz: string): string`: local wall time to a UTC ISO string.
  - `localDay(iso: string, tz: string): string`: `YYYY-MM-DD` in that zone.
  - `formatTime(iso, tz): string` → `"11:30 AM"`.
  - `formatDateTime(iso, tz): string` → `"Sat, Apr 10, 11:30 AM PDT"`.
  - `formatDay(day: string): string` → `"Sat, Apr 10"`.
  - `dayDiff(from: string, to: string): number`: whole days between two `YYYY-MM-DD` strings.
  - `shiftDays(iso: string, tz: string, days: number): string`: moves by calendar days in the zone, keeping local clock time (DST-safe).
  - `daysBetween(start: string, end: string): string[]`: inclusive list of days, `[]` if `end < start`.
  - `formatItemTime(item: Pick<Item, "is_flexible" | "start_at" | "start_timezone">): string`: `"Anytime"` or the start time.
- Invalid zone or date throws an `Error`.

- [ ] **Step 1: Write the failing test** `src/lib/time/time.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import {
  dayDiff,
  daysBetween,
  formatDateTime,
  formatDay,
  formatItemTime,
  formatTime,
  localDay,
  localToUtcIso,
  shiftDays,
} from "@/lib/time";

const LA = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";

describe("overnight cross-time-zone flight (LAX to Tokyo)", () => {
  const dep = localToUtcIso("2027-04-10", "11:30", LA);
  const arr = localToUtcIso("2027-04-11", "15:45", TOKYO);

  it("converts local wall time to UTC", () => {
    expect(dep).toBe("2027-04-10T18:30:00.000Z");
    expect(arr).toBe("2027-04-11T06:45:00.000Z");
  });

  it("departs and arrives on different local days", () => {
    expect(localDay(dep, LA)).toBe("2027-04-10");
    expect(localDay(arr, TOKYO)).toBe("2027-04-11");
  });

  it("keeps the local day when UTC has already rolled over", () => {
    const lateEvening = localToUtcIso("2027-04-10", "20:00", LA); // 03:00Z on the 11th
    expect(lateEvening.startsWith("2027-04-11")).toBe(true);
    expect(localDay(lateEvening, LA)).toBe("2027-04-10");
  });

  it("formats each end in its own zone", () => {
    expect(formatTime(dep, LA)).toBe("11:30 AM");
    expect(formatTime(arr, TOKYO)).toBe("3:45 PM");
    expect(formatDateTime(dep, LA)).toContain("11:30 AM");
  });
});

describe("shiftDays", () => {
  it("keeps the local clock time", () => {
    expect(shiftDays("2027-04-12T00:00:00.000Z", TOKYO, 1)).toBe("2027-04-13T00:00:00.000Z");
  });

  it("keeps the local clock time across a DST change", () => {
    // 09:00 PST on Mar 13 2027, DST starts Mar 14: 09:00 PDT is one hour earlier in UTC
    expect(shiftDays("2027-03-13T17:00:00.000Z", LA, 2)).toBe("2027-03-15T16:00:00.000Z");
  });

  it("moves backwards", () => {
    expect(shiftDays("2027-04-13T00:00:00.000Z", TOKYO, -1)).toBe("2027-04-12T00:00:00.000Z");
  });
});

describe("days", () => {
  it("dayDiff counts whole days, signed", () => {
    expect(dayDiff("2027-04-10", "2027-04-13")).toBe(3);
    expect(dayDiff("2027-04-13", "2027-04-10")).toBe(-3);
  });

  it("daysBetween is inclusive and empty for an inverted range", () => {
    expect(daysBetween("2027-04-10", "2027-04-12")).toEqual(["2027-04-10", "2027-04-11", "2027-04-12"]);
    expect(daysBetween("2027-04-12", "2027-04-10")).toEqual([]);
  });

  it("formatDay is zone-independent", () => {
    expect(formatDay("2027-04-10")).toBe("Sat, Apr 10");
  });
});

describe("formatItemTime", () => {
  it("says Anytime for flexible items", () => {
    expect(formatItemTime(makeItem({ is_flexible: true }))).toBe("Anytime");
  });

  it("says Anytime when there is no start time", () => {
    expect(formatItemTime(makeItem({ start_at: null }))).toBe("Anytime");
  });

  it("formats the start in the item's zone", () => {
    const item = makeItem({ start_at: "2027-04-12T00:00:00.000Z", start_timezone: TOKYO });
    expect(formatItemTime(item)).toBe("9:00 AM");
  });
});

describe("invalid input", () => {
  it("throws on an unknown time zone", () => {
    expect(() => localDay("2027-04-10T00:00:00.000Z", "Mars/Olympus")).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/time` → Expected: FAIL, module not found.

- [ ] **Step 3: Write `src/lib/time/index.ts`**

```ts
import { DateTime } from "luxon";
import type { Item } from "@/types";

function valid(dt: DateTime): DateTime {
  if (!dt.isValid) throw new Error(`Invalid date/time: ${dt.invalidExplanation}`);
  return dt;
}

const utc = (isoOrDay: string) => valid(DateTime.fromISO(isoOrDay, { zone: "utc" }));
const inZone = (iso: string, tz: string) => valid(utc(iso).setZone(tz));

export function localToUtcIso(day: string, time: string, tz: string): string {
  return valid(DateTime.fromISO(`${day}T${time}`, { zone: tz })).toUTC().toISO()!;
}

export function localDay(iso: string, tz: string): string {
  return inZone(iso, tz).toISODate()!;
}

export function formatTime(iso: string, tz: string): string {
  return inZone(iso, tz).toFormat("h:mm a");
}

export function formatDateTime(iso: string, tz: string): string {
  return inZone(iso, tz).toFormat("ccc, LLL d, h:mm a ZZZZ");
}

export function formatDay(day: string): string {
  return utc(day).toFormat("ccc, LLL d");
}

export function dayDiff(from: string, to: string): number {
  return Math.round(utc(to).diff(utc(from), "days").days);
}

export function shiftDays(iso: string, tz: string, days: number): string {
  return inZone(iso, tz).plus({ days }).toUTC().toISO()!;
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const last = utc(end).toMillis();
  for (let d = utc(start); d.toMillis() <= last; d = d.plus({ days: 1 })) {
    out.push(d.toISODate()!);
  }
  return out;
}

export function formatItemTime(item: Pick<Item, "is_flexible" | "start_at" | "start_timezone">): string {
  if (item.is_flexible || !item.start_at) return "Anytime";
  return formatTime(item.start_at, item.start_timezone ?? "UTC");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/time` → Expected: 14 passed. If the AM/PM assertions fail on spacing, print the actual string and fix `toFormat`, do not loosen the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/time
git commit -m "feat: time module with overnight cross-zone and DST tests (ITEM-2, ITIN-6)"
```

---

### Task 4: Budget module

**Files:**
- Create: `src/lib/budget/index.ts`
- Test: `src/lib/budget/budget.test.ts`

**Interfaces:**
- Consumes: `Item` from `@/types`; `makeItem` from `@/test/factories`.
- Produces (from `@/lib/budget`):
  - `itemCost(item: Item): number`: `actual_cost ?? estimated_cost ?? 0`.
  - `type BudgetSummary = { estimated: number; paid: number; remainingExpected: number; budgetRemaining: number | null }`.
  - `summarize(items: Item[], totalBudget: number | null): BudgetSummary`: all items, ignores `idea`, rounded to cents.
  - `formatMoney(amount: number, currency: string): string` → `"$1,816"`, `"-$60"`.

- [ ] **Step 1: Write the failing test** `src/lib/budget/budget.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import { formatMoney, itemCost, summarize } from "@/lib/budget";

describe("summarize (PRD 4.6 example)", () => {
  const items = [
    makeItem({ type: "flight", status: "reserved", payment_status: "paid", estimated_cost: 872 }),
    makeItem({ type: "stay", status: "reserved", payment_status: "unpaid", estimated_cost: 760 }),
    makeItem({ status: "planned", estimated_cost: 184 }),
    makeItem({ status: "idea", estimated_cost: 500 }),
  ];

  it("matches the worked example", () => {
    expect(summarize(items, 3000)).toEqual({
      estimated: 1816,
      paid: 872,
      remainingExpected: 944,
      budgetRemaining: 1184,
    });
  });

  it("hides budget remaining when no budget is set", () => {
    expect(summarize(items, null).budgetRemaining).toBeNull();
  });
});

describe("itemCost", () => {
  it("prefers actual over estimated, then falls back to 0", () => {
    expect(itemCost(makeItem({ estimated_cost: 100, actual_cost: 120 }))).toBe(120);
    expect(itemCost(makeItem({ estimated_cost: 100 }))).toBe(100);
    expect(itemCost(makeItem())).toBe(0);
  });
});

describe("edge cases", () => {
  it("handles a trip with no items", () => {
    expect(summarize([], 1000)).toEqual({ estimated: 0, paid: 0, remainingExpected: 0, budgetRemaining: 1000 });
    expect(summarize([], null).budgetRemaining).toBeNull();
  });

  it("does not leak floating-point error into totals", () => {
    const items = [makeItem({ estimated_cost: 0.1 }), makeItem({ estimated_cost: 0.2 })];
    expect(summarize(items, null).estimated).toBe(0.3);
  });

  it("goes negative when over budget", () => {
    expect(summarize([makeItem({ estimated_cost: 120 })], 100).budgetRemaining).toBe(-20);
  });
});

describe("formatMoney", () => {
  it("formats whole and negative amounts", () => {
    expect(formatMoney(1816, "USD")).toBe("$1,816");
    expect(formatMoney(-60, "USD")).toBe("-$60");
    expect(formatMoney(12.5, "USD")).toBe("$12.5");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/budget` → Expected: FAIL, module not found.

- [ ] **Step 3: Write `src/lib/budget/index.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/budget` → Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/budget
git commit -m "feat: budget calculation per PRD 4.6 (BUD-1, BUD-2, BUD-4)"
```

---

### Task 5: Ordering module

**Files:**
- Create: `src/lib/ordering/index.ts`
- Test: `src/lib/ordering/ordering.test.ts`

**Interfaces:**
- Consumes: `Item` from `@/types`; `makeItem` from `@/test/factories`.
- Produces (from `@/lib/ordering`):
  - `EPSILON: number` (1e-6).
  - `positionBetween(prev: number | null, next: number | null): number`: midpoint; `null` neighbors extend by 1000; both `null` → 1000.
  - `needsRenumber(sortedPositions: number[]): boolean`: true if any neighbor gap is below `EPSILON`.
  - `renumber<T extends { position: number }>(items: T[]): T[]`: sorted, positions reset to 1000, 2000, …
  - `sortItems<T extends { day: string; position: number }>(items: T[]): T[]`: by day, then position; does not mutate.
  - `visibleItems(items: Item[], range: { start: string; end: string }): Item[]`: items whose `day` is in the inclusive range, sorted.
  - `insertPositionByTime(dayItems: Item[], startAt: string | null): number`: position to insert a new item among `dayItems` (already sorted by position) by start time. `null` or no later timed item → append.

- [ ] **Step 1: Write the failing test** `src/lib/ordering/ordering.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import {
  insertPositionByTime,
  needsRenumber,
  positionBetween,
  renumber,
  sortItems,
  visibleItems,
} from "@/lib/ordering";

describe("positionBetween", () => {
  it("takes the midpoint of two neighbors", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });
  it("extends past the ends", () => {
    expect(positionBetween(null, 3000)).toBe(2000);
    expect(positionBetween(1000, null)).toBe(2000);
  });
  it("starts an empty day at 1000", () => {
    expect(positionBetween(null, null)).toBe(1000);
  });
});

describe("renumbering", () => {
  it("detects gaps smaller than epsilon", () => {
    expect(needsRenumber([1000, 1000.0000001])).toBe(true);
    expect(needsRenumber([1000, 2000])).toBe(false);
    expect(needsRenumber([])).toBe(false);
  });
  it("sorts and spaces positions evenly", () => {
    const out = renumber([
      { id: "a", position: 1000.0000001 },
      { id: "b", position: 1000 },
    ]);
    expect(out).toEqual([
      { id: "b", position: 1000 },
      { id: "a", position: 2000 },
    ]);
  });
});

describe("sortItems / visibleItems", () => {
  const a = makeItem({ id: "a", day: "2027-04-11", position: 1000 });
  const b = makeItem({ id: "b", day: "2027-04-10", position: 2000 });
  const c = makeItem({ id: "c", day: "2027-04-10", position: 1000 });

  it("sorts by day then position without mutating", () => {
    const input = [a, b, c];
    expect(sortItems(input).map((i) => i.id)).toEqual(["c", "b", "a"]);
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by an inclusive range", () => {
    expect(visibleItems([a, b, c], { start: "2027-04-11", end: "2027-04-11" }).map((i) => i.id)).toEqual(["a"]);
  });

  it("returns nothing when the range misses every item", () => {
    expect(visibleItems([a, b, c], { start: "2027-05-01", end: "2027-05-02" })).toEqual([]);
  });
});

describe("insertPositionByTime", () => {
  const nine = makeItem({ start_at: "2027-04-10T09:00:00.000Z", position: 1000 });
  const one = makeItem({ start_at: "2027-04-10T13:00:00.000Z", position: 2000 });
  const flexible = makeItem({ is_flexible: true, start_at: null, position: 3000 });
  const day = [nine, one, flexible];

  it("inserts between neighbors by start time", () => {
    expect(insertPositionByTime(day, "2027-04-10T11:00:00.000Z")).toBe(1500);
  });
  it("inserts before the first later item", () => {
    expect(insertPositionByTime(day, "2027-04-10T08:00:00.000Z")).toBe(0);
  });
  it("appends after the last item when nothing timed is later", () => {
    expect(insertPositionByTime(day, "2027-04-10T15:00:00.000Z")).toBe(4000);
  });
  it("appends flexible (untimed) items", () => {
    expect(insertPositionByTime(day, null)).toBe(4000);
  });
  it("handles an empty day", () => {
    expect(insertPositionByTime([], "2027-04-10T09:00:00.000Z")).toBe(1000);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/ordering` → Expected: FAIL, module not found.

- [ ] **Step 3: Write `src/lib/ordering/index.ts`**

```ts
import type { Item } from "@/types";

export const EPSILON = 1e-6;
const STEP = 1000;

export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return STEP;
  if (prev === null) return next! - STEP;
  if (next === null) return prev + STEP;
  return (prev + next) / 2;
}

export function needsRenumber(sortedPositions: number[]): boolean {
  return sortedPositions.some((p, i) => i > 0 && p - sortedPositions[i - 1] < EPSILON);
}

export function renumber<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position).map((it, i) => ({ ...it, position: (i + 1) * STEP }));
}

export function sortItems<T extends { day: string; position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position);
}

export function visibleItems(items: Item[], range: { start: string; end: string }): Item[] {
  return sortItems(items.filter((i) => i.day >= range.start && i.day <= range.end));
}

export function insertPositionByTime(dayItems: Item[], startAt: string | null): number {
  const last = dayItems.length ? dayItems[dayItems.length - 1].position : null;
  if (startAt === null) return positionBetween(last, null);
  const idx = dayItems.findIndex((i) => i.start_at !== null && Date.parse(i.start_at) > Date.parse(startAt));
  if (idx === -1) return positionBetween(last, null);
  return positionBetween(idx === 0 ? null : dayItems[idx - 1].position, dayItems[idx].position);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/ordering` → Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ordering
git commit -m "feat: ordering and visible-range helpers (ITIN-1, ITIN-4, ITIN-10)"
```

---

### Task 6: Map module (colors done, path stubbed)

**Files:**
- Create: `src/lib/map/colors.ts`, `src/lib/map/path.ts`
- Test: `src/lib/map/colors.test.ts`, `src/lib/map/path.test.ts`

**Interfaces:**
- Consumes: `Item` from `@/types`; `makeItem` from `@/test/factories`.
- Produces:
  - `DAY_COLORS: readonly string[]` (8 hex colors), `dayColor(dayIndex: number): string` (cycles).
  - `type LatLng = [number, number]`, `type Segment = { from: LatLng; to: LatLng; kind: "line" | "arc" }`.
  - `buildPath(items: Item[]): Segment[]`: contract: items are in visit order. An item's entry is its start coords, its exit is its end coords (or start coords if none). Items without start coords are skipped. A flight with end coords adds an `"arc"` from its start to its end. Consecutive kept items are joined by a `"line"` from the previous exit to the next entry. Fewer than two kept items → `[]`.
  - `arcPoints(from: LatLng, to: LatLng, segments?: number): LatLng[]` (default 24): `segments + 1` points, first equals `from`, last equals `to`, intermediate points bowed away from the straight line (quadratic curve).
  - **`buildPath` and `arcPoints` are stubs that throw `"not implemented"`. Their tests are written in full and are expected to FAIL until M4.** This is the spec's "fails visibly" checklist.

- [ ] **Step 1: Write the colors test** `src/lib/map/colors.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DAY_COLORS, dayColor } from "@/lib/map/colors";

describe("dayColor", () => {
  it("has 8 distinct colors", () => {
    expect(DAY_COLORS).toHaveLength(8);
    expect(new Set(DAY_COLORS).size).toBe(8);
  });
  it("cycles after 8 days", () => {
    expect(dayColor(0)).toBe(DAY_COLORS[0]);
    expect(dayColor(8)).toBe(DAY_COLORS[0]);
    expect(dayColor(10)).toBe(DAY_COLORS[2]);
  });
});
```

- [ ] **Step 2: Write `src/lib/map/colors.ts`**

```ts
// Hex values because Leaflet cannot read Tailwind tokens. Color-blind-safe palette.
// Never the only signal: pins also carry numbers and day labels.
export const DAY_COLORS = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#CC79A7",
  "#D55E00",
  "#56B4E9",
  "#B8A100",
  "#6B6B6B",
] as const;

export const dayColor = (dayIndex: number): string => DAY_COLORS[dayIndex % DAY_COLORS.length];
```

- [ ] **Step 3: Write the path tests** `src/lib/map/path.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { makeItem } from "@/test/factories";
import { arcPoints, buildPath } from "@/lib/map/path";

const at = (lat: number, lng: number) => ({ start_lat: lat, start_lng: lng });

describe("buildPath", () => {
  it("joins consecutive stops with a line from exit to entry", () => {
    const path = buildPath([makeItem(at(1, 1)), makeItem(at(2, 2))]);
    expect(path).toEqual([{ from: [1, 1], to: [2, 2], kind: "line" }]);
  });

  it("draws a flight as an arc and continues from its arrival", () => {
    const flight = makeItem({ type: "flight", ...at(1, 1), end_lat: 5, end_lng: 5 });
    const path = buildPath([makeItem(at(0, 0)), flight, makeItem(at(6, 6))]);
    expect(path).toEqual([
      { from: [0, 0], to: [1, 1], kind: "line" },
      { from: [1, 1], to: [5, 5], kind: "arc" },
      { from: [5, 5], to: [6, 6], kind: "line" },
    ]);
  });

  it("skips items without coordinates", () => {
    const path = buildPath([makeItem(at(0, 0)), makeItem(), makeItem(at(2, 2))]);
    expect(path).toEqual([{ from: [0, 0], to: [2, 2], kind: "line" }]);
  });

  it("returns nothing for fewer than two mappable stops", () => {
    expect(buildPath([])).toEqual([]);
    expect(buildPath([makeItem(at(1, 1))])).toEqual([]);
  });
});

describe("arcPoints", () => {
  it("starts at from, ends at to, and has segments + 1 points", () => {
    const pts = arcPoints([0, 0], [0, 10], 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[10]).toEqual([0, 10]);
  });

  it("bows away from the straight line", () => {
    const pts = arcPoints([0, 0], [0, 10], 10);
    expect(pts[5][0]).not.toBe(0);
  });
});
```

- [ ] **Step 4: Write the stubs** `src/lib/map/path.ts`

```ts
import type { Item } from "@/types";

export type LatLng = [number, number];
export type Segment = { from: LatLng; to: LatLng; kind: "line" | "arc" };

/** Items in visit order. See the plan's Task 6 contract. Implemented in milestone M4. */
export function buildPath(items: Item[]): Segment[] {
  void items;
  throw new Error("not implemented: buildPath (M4, MAP-3)");
}

/** Quadratic arc between two points. Implemented in milestone M4. */
export function arcPoints(from: LatLng, to: LatLng, segments = 24): LatLng[] {
  void from;
  void to;
  void segments;
  throw new Error("not implemented: arcPoints (M4, MAP-3)");
}
```

- [ ] **Step 5: Run and verify the expected split**

Run: `npx vitest run src/lib/map` → Expected: colors test PASSES (2), `path.test.ts` FAILS with 6 failing tests, each with `not implemented`. That is the intended state.

- [ ] **Step 6: Commit**

```bash
git add src/lib/map
git commit -m "feat: map day colors and failing path-building checklist (MAP-2, MAP-3)"
```

---

### Task 7: Repository, DemoRepository and seed

**Files:**
- Create: `src/lib/data/repository.ts`, `src/lib/data/demo-repository.ts`, `src/lib/data/demo-seed.ts`, `src/lib/data/repository.contract.ts`, `supabase/seed/demo-trip.json`
- Test: `src/lib/data/demo-repository.test.ts`, `src/lib/data/demo-seed.test.ts`

**Interfaces:**
- Consumes: schemas/types from `@/types`, `itemDefaults`/`SEED_STAMP` from `@/types/defaults`, `localDay`/`shiftDays`/`dayDiff` from `@/lib/time`, `sortItems` from `@/lib/ordering`, `summarize` from `@/lib/budget`, factories.
- Produces:
  - `Repository` (from `@/lib/data/repository`):
    ```ts
    export interface Repository {
      getTrips(): Promise<Trip[]>;
      getTrip(id: string): Promise<Trip | null>;
      createTrip(input: NewTrip): Promise<Trip>;
      updateTrip(id: string, patch: Partial<NewTrip>): Promise<Trip>;
      deleteTrip(id: string): Promise<void>;
      getItems(tripId: string): Promise<Item[]>; // ordered by day, then position
      createItem(input: NewItem): Promise<Item>;
      updateItem(id: string, patch: ItemPatch): Promise<Item>;
      deleteItem(id: string): Promise<void>;
      moveItem(id: string, day: string, position: number): Promise<Item>;
    }
    ```
  - `DemoRepository` (class, constructor takes `{ trips: Trip[]; items: Item[] }`).
  - `DEMO_TRIP_ID = "demo-trip"`, `loadDemoSeed()`, `createDemoRepository(): DemoRepository` (from `@/lib/data/demo-seed`).
  - `runRepositoryContract(name: string, make: () => Promise<Repository> | Repository): void` (from `@/lib/data/repository.contract`). The future Supabase repository must pass the same contract.
- `moveItem` semantics: sets `day` and `position`. For timed items it shifts `start_at` and `end_at` by the same number of local calendar days (from the start's local day to the new day), keeping clock times. Flexible or untimed items keep null times.

- [ ] **Step 1: Write the interface** `src/lib/data/repository.ts`

```ts
import type { Item, ItemPatch, NewItem, NewTrip, Trip } from "@/types";

export interface Repository {
  getTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | null>;
  createTrip(input: NewTrip): Promise<Trip>;
  updateTrip(id: string, patch: Partial<NewTrip>): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;
  /** Ordered by day, then position. */
  getItems(tripId: string): Promise<Item[]>;
  createItem(input: NewItem): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<Item>;
  deleteItem(id: string): Promise<void>;
  /** Sets day and position. Timed items keep their local clock time on the new day. */
  moveItem(id: string, day: string, position: number): Promise<Item>;
}
```

- [ ] **Step 2: Write the shared contract** `src/lib/data/repository.contract.ts`

```ts
import { describe, expect, it } from "vitest";
import { makeNewItem } from "@/test/factories";
import type { NewTrip } from "@/types";
import type { Repository } from "./repository";

const newTrip = (over: Partial<NewTrip> = {}): NewTrip => ({
  name: "Contract trip",
  start_date: "2027-04-10",
  end_date: "2027-04-18",
  destinations: [],
  currency: "USD",
  total_budget: null,
  ...over,
});

export function runRepositoryContract(name: string, make: () => Promise<Repository> | Repository) {
  describe(`${name} satisfies the repository contract`, () => {
    async function setup() {
      const repo = await make();
      const trip = await repo.createTrip(newTrip());
      return { repo, trip };
    }

    it("creates and reads trips", async () => {
      const { repo, trip } = await setup();
      expect(await repo.getTrip(trip.id)).toEqual(trip);
      expect((await repo.getTrips()).map((t) => t.id)).toContain(trip.id);
    });

    it("returns null for an unknown trip", async () => {
      expect(await (await make()).getTrip("nope")).toBeNull();
    });

    it("rejects a trip that ends before it starts", async () => {
      const repo = await make();
      await expect(repo.createTrip(newTrip({ start_date: "2027-04-10", end_date: "2027-04-09" }))).rejects.toThrow();
    });

    it("creates, updates and deletes items", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, title: "Lunch" }));
      expect((await repo.getItems(trip.id)).map((i) => i.id)).toEqual([item.id]);

      const updated = await repo.updateItem(item.id, { title: "Dinner" });
      expect(updated.title).toBe("Dinner");

      await repo.deleteItem(item.id);
      expect(await repo.getItems(trip.id)).toEqual([]);
    });

    it("returns items ordered by day, then position", async () => {
      const { repo, trip } = await setup();
      const late = await repo.createItem(makeNewItem({ trip_id: trip.id, day: "2027-04-11", position: 1000 }));
      const second = await repo.createItem(makeNewItem({ trip_id: trip.id, day: "2027-04-10", position: 2000 }));
      const first = await repo.createItem(makeNewItem({ trip_id: trip.id, day: "2027-04-10", position: 1000 }));
      expect((await repo.getItems(trip.id)).map((i) => i.id)).toEqual([first.id, second.id, late.id]);
    });

    it("rejects an item that is paid but not reserved", async () => {
      const { repo, trip } = await setup();
      await expect(
        repo.createItem(makeNewItem({ trip_id: trip.id, status: "planned", payment_status: "paid" })),
      ).rejects.toThrow();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, status: "planned" }));
      await expect(repo.updateItem(item.id, { payment_status: "paid" })).rejects.toThrow();
    });

    it("rejects updates and moves for unknown items", async () => {
      const repo = await make();
      await expect(repo.updateItem("nope", { title: "x" })).rejects.toThrow();
      await expect(repo.moveItem("nope", "2027-04-11", 1000)).rejects.toThrow();
    });

    it("deleting a trip deletes its items", async () => {
      const { repo, trip } = await setup();
      await repo.createItem(makeNewItem({ trip_id: trip.id }));
      await repo.deleteTrip(trip.id);
      expect(await repo.getTrip(trip.id)).toBeNull();
      expect(await repo.getItems(trip.id)).toEqual([]);
    });

    it("moveItem changes day and position and keeps the local clock time", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(
        makeNewItem({
          trip_id: trip.id,
          day: "2027-04-12",
          start_at: "2027-04-12T00:00:00.000Z",
          end_at: "2027-04-12T02:00:00.000Z",
          start_timezone: "Asia/Tokyo",
          end_timezone: "Asia/Tokyo",
        }),
      );
      const moved = await repo.moveItem(item.id, "2027-04-13", 500);
      expect(moved.day).toBe("2027-04-13");
      expect(moved.position).toBe(500);
      expect(moved.start_at).toBe("2027-04-13T00:00:00.000Z");
      expect(moved.end_at).toBe("2027-04-13T02:00:00.000Z");
    });

    it("moveItem keeps a multi-day flight's arrival the same number of days after departure", async () => {
      const { repo, trip } = await setup();
      const flight = await repo.createItem(
        makeNewItem({
          trip_id: trip.id,
          type: "flight",
          day: "2027-04-10",
          start_at: "2027-04-10T18:30:00.000Z", // 11:30 PDT
          end_at: "2027-04-11T06:45:00.000Z", // 15:45 JST next day
          start_timezone: "America/Los_Angeles",
          end_timezone: "Asia/Tokyo",
        }),
      );
      const moved = await repo.moveItem(flight.id, "2027-04-12", 1000);
      expect(moved.start_at).toBe("2027-04-12T18:30:00.000Z");
      expect(moved.end_at).toBe("2027-04-13T06:45:00.000Z");
    });

    it("moveItem leaves flexible items without times", async () => {
      const { repo, trip } = await setup();
      const item = await repo.createItem(makeNewItem({ trip_id: trip.id, is_flexible: true }));
      const moved = await repo.moveItem(item.id, "2027-04-14", 1000);
      expect(moved.day).toBe("2027-04-14");
      expect(moved.start_at).toBeNull();
      expect(moved.end_at).toBeNull();
    });
  });
}
```

- [ ] **Step 3: Write the failing tests** `src/lib/data/demo-repository.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { createDemoRepository, DEMO_TRIP_ID } from "./demo-seed";
import { runRepositoryContract } from "./repository.contract";

runRepositoryContract("DemoRepository", () => createDemoRepository());

describe("DemoRepository", () => {
  it("starts with the seeded demo trip", async () => {
    const trip = await createDemoRepository().getTrip(DEMO_TRIP_ID);
    expect(trip?.name).toBe("Japan 2027");
  });

  it("never leaks mutations between instances", async () => {
    const a = createDemoRepository();
    const b = createDemoRepository();
    await a.deleteTrip(DEMO_TRIP_ID);
    expect(await a.getTrip(DEMO_TRIP_ID)).toBeNull();
    expect(await b.getTrip(DEMO_TRIP_ID)).not.toBeNull();
    expect((await b.getItems(DEMO_TRIP_ID)).length).toBeGreaterThan(0);
  });

  it("does not let callers mutate the store through returned objects", async () => {
    const repo = createDemoRepository();
    const [trip] = await repo.getTrips();
    trip.name = "hacked";
    expect((await repo.getTrips())[0].name).toBe("Japan 2027");
  });
});
```

`src/lib/data/demo-seed.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/budget";
import { localDay } from "@/lib/time";
import { loadDemoSeed } from "./demo-seed";

describe("demo seed", () => {
  const { trips, items } = loadDemoSeed();

  it("parses against the schemas and has one trip", () => {
    expect(trips).toHaveLength(1);
    expect(items.length).toBeGreaterThanOrEqual(10);
  });

  it("covers every item type, a flexible item, an idea and a paid item", () => {
    expect(new Set(items.map((i) => i.type))).toEqual(new Set(["flight", "stay", "activity"]));
    expect(items.some((i) => i.is_flexible)).toBe(true);
    expect(items.some((i) => i.status === "idea")).toBe(true);
    expect(items.some((i) => i.payment_status === "paid")).toBe(true);
  });

  it("has an overnight cross-time-zone flight", () => {
    const flight = items.find((i) => i.type === "flight")!;
    const dep = localDay(flight.start_at!, flight.start_timezone!);
    const arr = localDay(flight.end_at!, flight.end_timezone!);
    expect(arr > dep).toBe(true);
    expect(flight.start_timezone).not.toBe(flight.end_timezone);
  });

  it("puts every timed item on the local day of its start", () => {
    for (const i of items.filter((x) => x.start_at)) {
      expect(localDay(i.start_at!, i.start_timezone!), i.title).toBe(i.day);
    }
  });

  it("stays inside the trip dates", () => {
    const { start_date, end_date } = trips[0];
    for (const i of items) expect(i.day >= start_date && i.day <= end_date, i.title).toBe(true);
  });

  it("budget numbers are the known values", () => {
    expect(summarize(items, trips[0].total_budget)).toEqual({
      estimated: 2940,
      paid: 907,
      remainingExpected: 2033,
      budgetRemaining: 60,
    });
  });
});
```

- [ ] **Step 4: Run to verify they fail**

Run: `npx vitest run src/lib/data` → Expected: FAIL, `./demo-seed` not found.

- [ ] **Step 5: Write the seed** `supabase/seed/demo-trip.json`

Items list only non-default fields. `demo-seed.ts` fills the rest with `itemDefaults()`.

```json
{
  "trips": [
    {
      "id": "demo-trip",
      "user_id": "demo-user",
      "name": "Japan 2027",
      "start_date": "2027-04-10",
      "end_date": "2027-04-18",
      "destinations": ["Tokyo", "Kyoto"],
      "currency": "USD",
      "total_budget": 3000,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "items": [
    {
      "id": "demo-flight-out", "trip_id": "demo-trip", "type": "flight", "title": "LAX to Tokyo Haneda",
      "day": "2027-04-10", "position": 1000,
      "start_at": "2027-04-10T18:30:00.000Z", "end_at": "2027-04-11T06:45:00.000Z",
      "start_timezone": "America/Los_Angeles", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Los Angeles (LAX)", "start_lat": 33.9416, "start_lng": -118.4085,
      "end_location_name": "Tokyo Haneda (HND)", "end_lat": 35.5494, "end_lng": 139.7798,
      "estimated_cost": 872, "actual_cost": 872, "status": "reserved", "payment_status": "paid",
      "confirmation_number": "NH7K2Q",
      "metadata": { "airline": "ANA", "flight_number": "NH105", "seat": "32A" }
    },
    {
      "id": "demo-stay-tokyo", "trip_id": "demo-trip", "type": "stay", "title": "Hotel Gracery Shinjuku",
      "day": "2027-04-11", "position": 1000,
      "start_at": "2027-04-11T07:30:00.000Z", "end_at": "2027-04-14T02:00:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Hotel Gracery Shinjuku", "start_address": "1 Chome-19-1 Kabukicho, Shinjuku City",
      "start_lat": 35.6955, "start_lng": 139.7003,
      "estimated_cost": 620, "status": "reserved", "payment_status": "unpaid",
      "confirmation_number": "GRC-48213", "metadata": { "room": "Double" }
    },
    {
      "id": "demo-ramen", "trip_id": "demo-trip", "type": "activity", "title": "Ramen at Ichiran Shinjuku",
      "day": "2027-04-11", "position": 2000,
      "start_at": "2027-04-11T10:00:00.000Z", "end_at": "2027-04-11T11:00:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Ichiran Shinjuku", "start_lat": 35.6911, "start_lng": 139.7005,
      "estimated_cost": 18, "metadata": { "category": "restaurant" }
    },
    {
      "id": "demo-sensoji", "trip_id": "demo-trip", "type": "activity", "title": "Senso-ji Temple",
      "day": "2027-04-12", "position": 1000,
      "start_at": "2027-04-12T00:00:00.000Z", "end_at": "2027-04-12T02:00:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Senso-ji Temple", "start_lat": 35.7148, "start_lng": 139.7967,
      "estimated_cost": 0, "metadata": { "category": "activity" }
    },
    {
      "id": "demo-teamlab", "trip_id": "demo-trip", "type": "activity", "title": "teamLab Planets",
      "day": "2027-04-12", "position": 2000,
      "start_at": "2027-04-12T05:00:00.000Z", "end_at": "2027-04-12T07:00:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "teamLab Planets", "start_lat": 35.6491, "start_lng": 139.7897,
      "estimated_cost": 32, "actual_cost": 35, "status": "reserved", "payment_status": "paid",
      "confirmation_number": "TLP-99120", "metadata": { "ticket_info": "Timed entry" }
    },
    {
      "id": "demo-akihabara", "trip_id": "demo-trip", "type": "activity", "title": "Explore Akihabara",
      "day": "2027-04-12", "position": 3000, "is_flexible": true,
      "start_timezone": "Asia/Tokyo",
      "start_location_name": "Akihabara", "start_lat": 35.6984, "start_lng": 139.7731,
      "estimated_cost": 40, "status": "idea",
      "notes": "Retro games and arcades if there is energy left",
      "metadata": { "category": "activity" }
    },
    {
      "id": "demo-tsukiji", "trip_id": "demo-trip", "type": "activity", "title": "Breakfast at Tsukiji Outer Market",
      "day": "2027-04-13", "position": 1000,
      "start_at": "2027-04-12T23:00:00.000Z", "end_at": "2027-04-13T00:30:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Tsukiji Outer Market", "start_lat": 35.6655, "start_lng": 139.7707,
      "estimated_cost": 25, "metadata": { "category": "restaurant" }
    },
    {
      "id": "demo-shinkansen", "trip_id": "demo-trip", "type": "activity", "title": "Shinkansen to Kyoto",
      "day": "2027-04-14", "position": 1000,
      "start_at": "2027-04-14T01:00:00.000Z", "end_at": "2027-04-14T03:15:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Tokyo Station", "start_lat": 35.6812, "start_lng": 139.7671,
      "end_location_name": "Kyoto Station", "end_lat": 34.9858, "end_lng": 135.7588,
      "estimated_cost": 130, "metadata": { "ticket_info": "Reserved seats, car 7" }
    },
    {
      "id": "demo-stay-kyoto", "trip_id": "demo-trip", "type": "stay", "title": "Kyoto Machiya Inn",
      "day": "2027-04-14", "position": 2000,
      "start_at": "2027-04-14T06:00:00.000Z", "end_at": "2027-04-17T01:00:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Kyoto Machiya Inn", "start_address": "Gion, Higashiyama Ward, Kyoto",
      "start_lat": 35.0037, "start_lng": 135.7756,
      "estimated_cost": 480, "metadata": { "room": "Tatami room" }
    },
    {
      "id": "demo-fushimi", "trip_id": "demo-trip", "type": "activity", "title": "Fushimi Inari Shrine",
      "day": "2027-04-15", "position": 1000,
      "start_at": "2027-04-14T22:30:00.000Z", "end_at": "2027-04-15T01:00:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Fushimi Inari Shrine", "start_lat": 34.9671, "start_lng": 135.7727,
      "estimated_cost": 0, "metadata": { "category": "activity" }
    },
    {
      "id": "demo-kaiseki", "trip_id": "demo-trip", "type": "activity", "title": "Kaiseki dinner in Gion",
      "day": "2027-04-15", "position": 2000,
      "start_at": "2027-04-15T09:30:00.000Z", "end_at": "2027-04-15T11:30:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "Asia/Tokyo",
      "start_location_name": "Gion Kaiseki", "start_lat": 35.0036, "start_lng": 135.7752,
      "estimated_cost": 120, "status": "reserved", "payment_status": "unpaid",
      "confirmation_number": "GION-0415", "metadata": { "category": "restaurant" }
    },
    {
      "id": "demo-flight-home", "trip_id": "demo-trip", "type": "flight", "title": "Osaka KIX to Los Angeles",
      "day": "2027-04-17", "position": 1000,
      "start_at": "2027-04-17T09:00:00.000Z", "end_at": "2027-04-17T18:30:00.000Z",
      "start_timezone": "Asia/Tokyo", "end_timezone": "America/Los_Angeles",
      "start_location_name": "Osaka Kansai (KIX)", "start_lat": 34.432, "start_lng": 135.2304,
      "end_location_name": "Los Angeles (LAX)", "end_lat": 33.9416, "end_lng": -118.4085,
      "estimated_cost": 640, "status": "reserved", "payment_status": "unpaid",
      "confirmation_number": "JL9X4B", "metadata": { "airline": "Japan Airlines", "flight_number": "JL61" }
    }
  ]
}
```
Budget check: 872 + 620 + 18 + 0 + 35 + 25 + 130 + 480 + 0 + 120 + 640 = 2940 (the idea item is excluded), paid 872 + 35 = 907.

- [ ] **Step 6: Write `src/lib/data/demo-seed.ts`**

```ts
import raw from "../../../supabase/seed/demo-trip.json";
import { ItemSchema, TripSchema } from "@/types/schemas";
import { itemDefaults, SEED_STAMP } from "@/types/defaults";
import type { Item, Trip } from "@/types";
import { DemoRepository } from "./demo-repository";

export const DEMO_TRIP_ID = "demo-trip";

/** Validates the sparse JSON against the schemas, filling nulls from itemDefaults(). */
export function loadDemoSeed(): { trips: Trip[]; items: Item[] } {
  return {
    trips: raw.trips.map((t) => TripSchema.parse(t)),
    items: raw.items.map((i) =>
      ItemSchema.parse({ ...itemDefaults(), created_at: SEED_STAMP, updated_at: SEED_STAMP, ...i }),
    ),
  };
}

export const createDemoRepository = (): DemoRepository => new DemoRepository(loadDemoSeed());
```

- [ ] **Step 7: Write `src/lib/data/demo-repository.ts`**

```ts
import { dayDiff, localDay, shiftDays } from "@/lib/time";
import { sortItems } from "@/lib/ordering";
import { ItemSchema, NewItemSchema, NewTripSchema, TripSchema } from "@/types/schemas";
import type { Item, ItemPatch, NewItem, NewTrip, Trip } from "@/types";
import type { Repository } from "./repository";

const DEMO_USER = "demo-user";
const now = () => new Date().toISOString();

export class DemoRepository implements Repository {
  private trips: Trip[];
  private items: Item[];

  constructor(seed: { trips: Trip[]; items: Item[] }) {
    this.trips = structuredClone(seed.trips);
    this.items = structuredClone(seed.items);
  }

  private tripIndex(id: string): number {
    const i = this.trips.findIndex((t) => t.id === id);
    if (i === -1) throw new Error(`Trip not found: ${id}`);
    return i;
  }

  private itemIndex(id: string): number {
    const i = this.items.findIndex((x) => x.id === id);
    if (i === -1) throw new Error(`Item not found: ${id}`);
    return i;
  }

  async getTrips() {
    return structuredClone(this.trips);
  }

  async getTrip(id: string) {
    return structuredClone(this.trips.find((t) => t.id === id)) ?? null;
  }

  async createTrip(input: NewTrip) {
    const data = NewTripSchema.parse(input);
    const trip: Trip = { ...data, id: crypto.randomUUID(), user_id: DEMO_USER, created_at: now(), updated_at: now() };
    this.trips.push(trip);
    return structuredClone(trip);
  }

  async updateTrip(id: string, patch: Partial<NewTrip>) {
    const i = this.tripIndex(id);
    const next = TripSchema.parse({ ...this.trips[i], ...patch, updated_at: now() });
    this.trips[i] = next;
    return structuredClone(next);
  }

  async deleteTrip(id: string) {
    this.trips = this.trips.filter((t) => t.id !== id);
    this.items = this.items.filter((x) => x.trip_id !== id);
  }

  async getItems(tripId: string) {
    return structuredClone(sortItems(this.items.filter((x) => x.trip_id === tripId)));
  }

  async createItem(input: NewItem) {
    const data = NewItemSchema.parse(input);
    this.tripIndex(data.trip_id);
    const item: Item = { ...data, id: crypto.randomUUID(), created_at: now(), updated_at: now() };
    this.items.push(item);
    return structuredClone(item);
  }

  async updateItem(id: string, patch: ItemPatch) {
    const i = this.itemIndex(id);
    const next = ItemSchema.parse({ ...this.items[i], ...patch, updated_at: now() });
    this.items[i] = next;
    return structuredClone(next);
  }

  async deleteItem(id: string) {
    this.items = this.items.filter((x) => x.id !== id);
  }

  async moveItem(id: string, day: string, position: number) {
    const old = this.items[this.itemIndex(id)];
    if (old.is_flexible || !old.start_at) return this.updateItem(id, { day, position });

    const startTz = old.start_timezone ?? "UTC";
    const delta = dayDiff(localDay(old.start_at, startTz), day);
    return this.updateItem(id, {
      day,
      position,
      start_at: shiftDays(old.start_at, startTz, delta),
      end_at: old.end_at ? shiftDays(old.end_at, old.end_timezone ?? startTz, delta) : null,
    });
  }
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/lib/data` → Expected: contract (10) + demo repository (3) + seed (6) all pass. If the seed test fails on a specific item title, fix that item's JSON times, not the test.

- [ ] **Step 9: Commit**

```bash
git add src/lib/data supabase/seed
git commit -m "feat: Repository interface, DemoRepository, seeded Japan trip (DEMO-1, DEMO-4)"
```

---

### Task 8: Provider and query hooks

**Files:**
- Create: `src/lib/data/provider.tsx`, `src/lib/data/hooks.ts`

**Interfaces:**
- Consumes: `Repository`, types.
- Produces:
  - `RepositoryProvider({ repository, children })`: creates one `QueryClient`, supplies the repository.
  - `useRepository(): Repository` (throws outside the provider).
  - `useTrip(id: string)`, `useItems(tripId: string)`: TanStack `useQuery` results (`data`, `isPending`, `isError`).
  - `useCreateItem(tripId)`, `useUpdateItem(tripId)` (vars `{ id, patch }`), `useMoveItem(tripId)` (vars `{ id, day, position }`), `useDeleteItem(tripId)` (vars `id`): mutations that invalidate the items query. Not used by any UI yet. Milestones M2 and M3 wire them up.

No unit test: these are thin glue, covered end to end by the Playwright flows in Task 12. Typecheck is the check.

- [ ] **Step 1: Write `src/lib/data/provider.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Repository } from "./repository";

const RepositoryContext = createContext<Repository | null>(null);

export function RepositoryProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
    </QueryClientProvider>
  );
}

export function useRepository(): Repository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error("useRepository must be used inside RepositoryProvider");
  return repo;
}
```

- [ ] **Step 2: Write `src/lib/data/hooks.ts`**

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemPatch, NewItem } from "@/types";
import { useRepository } from "./provider";
import type { Repository } from "./repository";

const keys = {
  trip: (id: string) => ["trip", id] as const,
  items: (tripId: string) => ["items", tripId] as const,
};

export function useTrip(id: string) {
  const repo = useRepository();
  return useQuery({ queryKey: keys.trip(id), queryFn: () => repo.getTrip(id) });
}

export function useItems(tripId: string) {
  const repo = useRepository();
  return useQuery({ queryKey: keys.items(tripId), queryFn: () => repo.getItems(tripId) });
}

function useItemsMutation<V>(tripId: string, run: (repo: Repository, vars: V) => Promise<unknown>) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: V) => run(repo, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.items(tripId) }),
  });
}

export const useCreateItem = (tripId: string) =>
  useItemsMutation(tripId, (r, input: NewItem) => r.createItem(input));

export const useUpdateItem = (tripId: string) =>
  useItemsMutation(tripId, (r, v: { id: string; patch: ItemPatch }) => r.updateItem(v.id, v.patch));

export const useMoveItem = (tripId: string) =>
  useItemsMutation(tripId, (r, v: { id: string; day: string; position: number }) =>
    r.moveItem(v.id, v.day, v.position),
  );

export const useDeleteItem = (tripId: string) => useItemsMutation(tripId, (r, id: string) => r.deleteItem(id));
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/provider.tsx src/lib/data/hooks.ts
git commit -m "feat: RepositoryProvider and TanStack Query hooks (NFR-1)"
```

---

### Task 9: Workspace store

**Files:**
- Create: `src/stores/workspace.ts`
- Test: `src/stores/workspace.test.ts`

**Interfaces:**
- Produces: `useWorkspace` Zustand hook with state `{ selectedItemId: string | null; range: Range }`, where `type Range = { start: string; end: string } | null` (`null` = whole trip), and actions `select(id: string | null)`, `setRange(range: Range)` (swaps start and end if start is after end), `reset()`.
- The derived visible-items list is `visibleItems(items, range)` from `@/lib/ordering` (Task 5). The store holds no item data.

- [ ] **Step 1: Write the failing test** `src/stores/workspace.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspace } from "@/stores/workspace";

beforeEach(() => useWorkspace.getState().reset());

describe("workspace store", () => {
  it("starts with nothing selected and the whole trip", () => {
    expect(useWorkspace.getState()).toMatchObject({ selectedItemId: null, range: null });
  });

  it("selects and deselects an item", () => {
    useWorkspace.getState().select("a");
    expect(useWorkspace.getState().selectedItemId).toBe("a");
    useWorkspace.getState().select(null);
    expect(useWorkspace.getState().selectedItemId).toBeNull();
  });

  it("sets and clears the range", () => {
    useWorkspace.getState().setRange({ start: "2027-04-12", end: "2027-04-14" });
    expect(useWorkspace.getState().range).toEqual({ start: "2027-04-12", end: "2027-04-14" });
    useWorkspace.getState().setRange(null);
    expect(useWorkspace.getState().range).toBeNull();
  });

  it("swaps an inverted range instead of producing an empty view", () => {
    useWorkspace.getState().setRange({ start: "2027-04-14", end: "2027-04-12" });
    expect(useWorkspace.getState().range).toEqual({ start: "2027-04-12", end: "2027-04-14" });
  });

  it("reset clears everything", () => {
    useWorkspace.getState().select("a");
    useWorkspace.getState().setRange({ start: "2027-04-12", end: "2027-04-14" });
    useWorkspace.getState().reset();
    expect(useWorkspace.getState()).toMatchObject({ selectedItemId: null, range: null });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/stores` → Expected: FAIL, module not found.

- [ ] **Step 3: Write `src/stores/workspace.ts`**

```ts
import { create } from "zustand";

export type Range = { start: string; end: string } | null;

type WorkspaceState = {
  selectedItemId: string | null;
  range: Range;
  select: (id: string | null) => void;
  setRange: (range: Range) => void;
  reset: () => void;
};

const initial = { selectedItemId: null, range: null as Range };

export const useWorkspace = create<WorkspaceState>()((set) => ({
  ...initial,
  select: (id) => set({ selectedItemId: id }),
  setRange: (range) => set({ range: range && range.start > range.end ? { start: range.end, end: range.start } : range }),
  reset: () => set(initial),
}));
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/stores` → Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/stores
git commit -m "feat: workspace store for selection and date range (ITIN-4, MAP-4)"
```

---

### Task 10: Workspace components

**Files:**
- Create: `src/components/itinerary/labels.ts`, `src/components/itinerary/ItemCard.tsx`, `src/components/itinerary/DetailCard.tsx`, `src/components/itinerary/Itinerary.tsx`, `src/components/itinerary/DateRangeControl.tsx`, `src/components/budget/BudgetSummary.tsx`, `src/components/trip/TripHeader.tsx`, `src/components/trip/Workspace.tsx`, `src/components/map/MapPanel.tsx`, `src/components/map/LazyMap.tsx`

**Interfaces:**
- Consumes: hooks (Task 8), store (Task 9), `visibleItems`, `summarize`/`formatMoney`/`itemCost`, time helpers, `dayColor`, shadcn `Button`/`buttonVariants`/`Badge`, `cn`.
- Produces: `Workspace({ tripId }: { tripId: string })` (client component; must render inside a `RepositoryProvider`).
- Accessible names the Playwright tests rely on (Task 12):
  - region "Budget summary"
  - region "Item details" (appears only when an item is selected)
  - item cards are `<button aria-pressed>` whose name starts with the item title
  - selects labelled "From day" and "To day"
  - button "Whole trip"
  - headings level 2 `Day N · Ddd, Mon D`
- Item cards, detail card and range control are intentionally minimal. Edit/Delete, forms, drag handles and the real map arrive in M2-M4. The header's Edit and Add buttons are disabled placeholders.

No unit tests here: UI shells over tested logic, verified by the Playwright flows in Task 12 and by `tsc`/`eslint`/`next build`.

- [ ] **Step 1: Write `src/components/itinerary/labels.ts`**

```ts
import type { BookingStatus, Item, ItemType, PaymentStatus } from "@/types";

export const TYPE_LABEL: Record<ItemType, string> = { flight: "Flight", stay: "Stay", activity: "Activity" };
export const STATUS_LABEL: Record<BookingStatus, string> = { idea: "Idea", planned: "Planned", reserved: "Reserved" };
export const PAYMENT_LABEL: Record<PaymentStatus, string> = { unpaid: "Unpaid", paid: "Paid" };

export function locationLabel(item: Item): string | null {
  const { start_location_name: from, end_location_name: to } = item;
  if (from && to) return `${from} → ${to}`;
  return from ?? to;
}
```

- [ ] **Step 2: Write `src/components/itinerary/ItemCard.tsx`**

```tsx
import { BedDouble, MapPin, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, itemCost } from "@/lib/budget";
import { formatItemTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Item } from "@/types";
import { locationLabel, STATUS_LABEL } from "./labels";

const ICONS = { flight: Plane, stay: BedDouble, activity: MapPin } as const;

type Props = { item: Item; currency: string; selected: boolean; onSelect: () => void };

export function ItemCard({ item, currency, selected, onSelect }: Props) {
  const Icon = ICONS[item.type];
  const cost = itemCost(item);
  const place = locationLabel(item);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2",
        selected && "border-primary bg-accent",
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
```
`lucide-react` is installed by `shadcn init`. If `npx tsc` reports it missing, run `npm install lucide-react`.

- [ ] **Step 3: Write `src/components/itinerary/DetailCard.tsx`**

```tsx
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
```

- [ ] **Step 4: Write `src/components/itinerary/Itinerary.tsx`**

```tsx
import { dayColor } from "@/lib/map/colors";
import { dayDiff, formatDay } from "@/lib/time";
import type { Item } from "@/types";
import { ItemCard } from "./ItemCard";

type Props = {
  tripStart: string;
  days: string[];
  items: Item[];
  currency: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function Itinerary({ tripStart, days, items, currency, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const dayIndex = dayDiff(tripStart, day);
        const dayItems = items.filter((i) => i.day === day);
        return (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: dayColor(dayIndex) }} />
              {`Day ${dayIndex + 1} · ${formatDay(day)}`}
            </h2>
            {dayItems.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nothing planned yet. Add something.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayItems.map((item) => (
                  <li key={item.id}>
                    <ItemCard
                      item={item}
                      currency={currency}
                      selected={item.id === selectedId}
                      onSelect={() => onSelect(item.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/components/itinerary/DateRangeControl.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { daysBetween, formatDay } from "@/lib/time";
import { useWorkspace } from "@/stores/workspace";
import type { Trip } from "@/types";

export function DateRangeControl({ trip }: { trip: Trip }) {
  const range = useWorkspace((s) => s.range);
  const setRange = useWorkspace((s) => s.setRange);
  const days = daysBetween(trip.start_date, trip.end_date);
  const start = range?.start ?? trip.start_date;
  const end = range?.end ?? trip.end_date;
  const select = "min-h-11 rounded-md border bg-background px-2";

  return (
    <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-3">
      <Button
        variant={range ? "outline" : "default"}
        aria-pressed={!range}
        className="min-h-11"
        onClick={() => setRange(null)}
      >
        Whole trip
      </Button>
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden>From</span>
        <select
          aria-label="From day"
          className={select}
          value={start}
          onChange={(e) => setRange({ start: e.target.value, end })}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {formatDay(d)}
            </option>
          ))}
        </select>
        <span aria-hidden>to</span>
        <select
          aria-label="To day"
          className={select}
          value={end}
          onChange={(e) => setRange({ start, end: e.target.value })}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {formatDay(d)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/components/budget/BudgetSummary.tsx`**

```tsx
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
```

- [ ] **Step 7: Write `src/components/trip/TripHeader.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/time";
import type { Trip } from "@/types";

export function TripHeader({ trip }: { trip: Trip }) {
  const places = trip.destinations.length > 0 ? ` · ${trip.destinations.join(", ")}` : "";
  return (
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className="text-2xl font-semibold">{trip.name}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDay(trip.start_date)} to {formatDay(trip.end_date)}
          {places}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="min-h-11" disabled>
          Edit
        </Button>
        <Button className="min-h-11" disabled>
          Add to trip
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 8: Write the map placeholder and lazy wrapper**

`src/components/map/MapPanel.tsx`:
```tsx
import type { Item } from "@/types";

export function MapPanel({ items }: { items: Item[] }) {
  const pins = items.filter((i) => i.start_lat !== null && i.start_lng !== null).length;
  return (
    <div className="flex h-[60vh] min-h-80 items-center justify-center rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground lg:sticky lg:top-4">
      Map coming soon. {pins} {pins === 1 ? "stop" : "stops"} in view.
    </div>
  );
}
```

`src/components/map/LazyMap.tsx` (MAP-8: the itinerary never waits for the map):
```tsx
"use client";

import dynamic from "next/dynamic";

export const LazyMap = dynamic(() => import("./MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => <div className="h-[60vh] min-h-80 animate-pulse rounded-lg bg-muted" />,
});
```

- [ ] **Step 9: Write `src/components/trip/Workspace.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import { DateRangeControl } from "@/components/itinerary/DateRangeControl";
import { DetailCard } from "@/components/itinerary/DetailCard";
import { Itinerary } from "@/components/itinerary/Itinerary";
import { LazyMap } from "@/components/map/LazyMap";
import { TripHeader } from "@/components/trip/TripHeader";
import { Button } from "@/components/ui/button";
import { useItems, useTrip } from "@/lib/data/hooks";
import { visibleItems } from "@/lib/ordering";
import { daysBetween } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/stores/workspace";

export function Workspace({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const items = useItems(tripId);
  const range = useWorkspace((s) => s.range);
  const selectedId = useWorkspace((s) => s.selectedItemId);
  const select = useWorkspace((s) => s.select);
  const [view, setView] = useState<"itinerary" | "map">("itinerary");

  if (trip.isPending || items.isPending) return <p role="status" className="p-6">Loading trip…</p>;
  if (trip.isError || items.isError) {
    return (
      <p role="alert" className="p-6">
        We couldn&apos;t load this trip. <Link href="/demo" className="underline">Try the demo instead.</Link>
      </p>
    );
  }
  if (!trip.data) return <p role="alert" className="p-6">Trip not found.</p>;

  const { data: t } = trip;
  const all = items.data;
  const effective = range ?? { start: t.start_date, end: t.end_date };
  const visible = visibleItems(all, effective);
  const days = daysBetween(effective.start, effective.end);
  const selected = all.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
      <TripHeader trip={t} />
      {/* Budget counts every item in the trip, not just the visible range (PRD 4.6). */}
      <BudgetSummary items={all} totalBudget={t.total_budget} currency={t.currency} />
      <DateRangeControl trip={t} />

      <div role="group" aria-label="View" className="flex gap-2 lg:hidden">
        {(["itinerary", "map"] as const).map((v) => (
          <Button
            key={v}
            variant={view === v ? "default" : "outline"}
            aria-pressed={view === v}
            className="min-h-11 flex-1 capitalize"
            onClick={() => setView(v)}
          >
            {v}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Itinerary" className={cn("flex flex-col gap-4", view === "map" && "hidden lg:flex")}>
          {selected && <DetailCard item={selected} currency={t.currency} onClose={() => select(null)} />}
          <Itinerary
            tripStart={t.start_date}
            days={days}
            items={visible}
            currency={t.currency}
            selectedId={selectedId}
            onSelect={select}
          />
        </section>
        <section aria-label="Map" className={cn(view === "itinerary" && "hidden lg:block")}>
          <LazyMap items={visible} />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint` → Expected: no errors. Fix any import-path or unused-variable complaint in the files above.

- [ ] **Step 11: Commit**

```bash
git add src/components
git commit -m "feat: workspace UI shells: itinerary, detail card, range, budget, lazy map (ITIN-1..4, BUD-1, UX-1, UX-2)"
```

---

### Task 11: Routes

**Files:**
- Create: `src/components/BackendPending.tsx`, `src/app/demo/page.tsx`, `src/app/demo/DemoApp.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/trips/page.tsx`, `src/app/trips/[tripId]/page.tsx`
- Modify: `src/app/page.tsx` (replace entirely), `src/app/layout.tsx` (metadata only)

**Interfaces:**
- Consumes: `Workspace`, `RepositoryProvider`, `createDemoRepository`, `DEMO_TRIP_ID`, `useWorkspace`.
- Produces: `/` landing (heading "Tripboard", link "Try the demo"), `/demo` (banner containing "sample data", full workspace), and placeholder pages for `/login`, `/signup`, `/trips`, `/trips/[tripId]`.

- [ ] **Step 1: Write `src/components/BackendPending.tsx`**

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function BackendPending({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">
        Accounts aren&apos;t connected yet. The demo trip works without signing in.
      </p>
      <Link href="/demo" className={buttonVariants()}>
        Try the demo
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Write the four placeholder pages**

`src/app/login/page.tsx`:
```tsx
import { BackendPending } from "@/components/BackendPending";

export default function LoginPage() {
  return <BackendPending title="Log in" />;
}
```
`src/app/signup/page.tsx`: same with `SignupPage` and title `"Sign up"`.
`src/app/trips/page.tsx`: same with `TripsPage` and title `"Your trips"`.
`src/app/trips/[tripId]/page.tsx`: same with `TripPage` and title `"Trip"`.

- [ ] **Step 3: Replace `src/app/page.tsx`**

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Tripboard</h1>
      <p className="text-lg text-muted-foreground">
        Your whole trip in one place: a day-by-day itinerary with a map that shows every stop.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/demo" className={buttonVariants({ size: "lg" })}>
          Try the demo
        </Link>
        <Link href="/signup" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Sign up
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Log in
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Write the demo route**

`src/app/demo/page.tsx`:
```tsx
import { DemoApp } from "./DemoApp";

export const metadata = { title: "Demo · Tripboard" };

export default function DemoPage() {
  return <DemoApp />;
}
```

`src/app/demo/DemoApp.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Workspace } from "@/components/trip/Workspace";
import { buttonVariants } from "@/components/ui/button";
import { RepositoryProvider } from "@/lib/data/provider";
import { createDemoRepository, DEMO_TRIP_ID } from "@/lib/data/demo-seed";
import { useWorkspace } from "@/stores/workspace";

export function DemoApp() {
  const [repository] = useState(createDemoRepository);
  const reset = useWorkspace((s) => s.reset);
  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <>
      <div role="note" className="flex flex-wrap items-center justify-center gap-3 bg-muted px-4 py-2 text-sm">
        <span>You&apos;re viewing sample data. Changes reset when you refresh.</span>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Sign up to plan your own
        </Link>
      </div>
      <RepositoryProvider repository={repository}>
        <Workspace tripId={DEMO_TRIP_ID} />
      </RepositoryProvider>
    </>
  );
}
```

- [ ] **Step 5: Set the site metadata**

In `src/app/layout.tsx`, replace the existing `metadata` export with:
```tsx
export const metadata: Metadata = {
  title: "Tripboard",
  description: "Plan a whole trip in one place: a day-by-day itinerary with a map.",
};
```

- [ ] **Step 6: Run the app and look at it**

Run: `npm run dev`, open `http://localhost:3000/demo`. Expected: the banner, "Japan 2027", a budget row ($3,000 / $2,940 / $907 / $2,033 / $60), 9 day sections (Apr 16 and Apr 18 show the empty state, Apr 12 shows an "Anytime" item), the map placeholder on the right. Narrow the window below 1024px and confirm the Itinerary/Map toggle works. Stop the server.

- [ ] **Step 7: Build**

Run: `npm run build` → Expected: succeeds with all routes listed.

- [ ] **Step 8: Commit**

```bash
git add src/app src/components/BackendPending.tsx
git commit -m "feat: landing, demo route and backend-pending placeholders (DEMO-1, DEMO-3, AUTH-3)"
```

---

### Task 12: End-to-end flows, README and final verification

**Files:**
- Create: `e2e/demo.spec.ts`
- Delete: `e2e/smoke.spec.ts`
- Modify: `README.md` (replace the scaffold's)

**Interfaces:**
- Consumes: accessible names listed in Task 10.

- [ ] **Step 1: Write the Playwright flows** `e2e/demo.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("landing leads to the demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tripboard" })).toBeVisible();
  await page.getByRole("link", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("demo loads without login and shows the budget", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText(/sample data/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Japan 2027" })).toBeVisible();
  const budget = page.getByRole("region", { name: "Budget summary" });
  for (const amount of ["$3,000", "$2,940", "$907", "$2,033", "$60"]) {
    await expect(budget).toContainText(amount);
  }
});

test("selecting an item opens its details and clearing closes them", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("region", { name: "Item details" })).toHaveCount(0);
  await page.getByRole("button", { name: /Senso-ji Temple/ }).click();
  const details = page.getByRole("region", { name: "Item details" });
  await expect(details).toContainText("Senso-ji Temple");
  await details.getByRole("button", { name: "Close" }).click();
  await expect(details).toHaveCount(0);
});

test("the date range filters the itinerary and Whole trip restores it", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByRole("button", { name: /Senso-ji Temple/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Shinkansen to Kyoto/ })).toBeVisible();
  await page.getByRole("button", { name: "Whole trip" }).click();
  await expect(page.getByRole("button", { name: /Senso-ji Temple/ })).toBeVisible();
});

test("an inverted range is swapped, not emptied", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("To day").selectOption("2027-04-12");
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByLabel("From day")).toHaveValue("2027-04-12");
  await expect(page.getByLabel("To day")).toHaveValue("2027-04-14");
  await expect(page.getByRole("button", { name: /Shinkansen to Kyoto/ })).toBeVisible();
});

test("the budget does not change when the range narrows", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("From day").selectOption("2027-04-14");
  await expect(page.getByRole("region", { name: "Budget summary" })).toContainText("$2,940");
});

test("placeholder routes point back to the demo", async ({ page }) => {
  await page.goto("/trips");
  await expect(page.getByRole("link", { name: "Try the demo" })).toBeVisible();
});
```

- [ ] **Step 2: Remove the superseded smoke test**

```bash
git rm e2e/smoke.spec.ts
```

- [ ] **Step 3: Run the end-to-end flows**

Run: `npm run e2e` → Expected: 7 passed. If "inverted range" fails because selecting From later than To is applied before To updates, check the order of `selectOption` calls first, then `DateRangeControl`'s `onChange` handlers.

- [ ] **Step 4: Replace `README.md`**

```markdown
# Tripboard

A travel planning web app: one trip workspace with a day-by-day itinerary, a map companion and a budget summary.

**Status: skeleton.** `/demo` runs end to end on seeded in-memory data. Accounts, the database, forms, drag and drop and the real map are not built yet.

## Run

    npm install
    npm run dev        # http://localhost:3000, try /demo
    npm test           # Vitest
    npm run e2e        # Playwright (starts the dev server)

`npm test` currently has 6 intentionally failing tests in `src/lib/map/path.test.ts`. They are the checklist for map path building (milestone M4).

## Structure

- `src/lib/data`: `Repository` interface, `DemoRepository`, shared contract test. A Supabase implementation plugs in here.
- `src/lib/{time,budget,ordering,map}`: pure, tested logic. Components never do date, money or ordering math.
- `src/stores/workspace.ts`: selected item and date range.
- `supabase/seed/demo-trip.json`: the demo trip.
- Docs: `docs/tripboard-overview.md`, `docs/tripboard-prd.md`, `docs/tripboard-technical.md`, `docs/superpowers/`.

## Next

Supabase schema, RLS and auth, then forms, drag and drop and the Leaflet map per the PRD milestones.
```

- [ ] **Step 5: Final verification**

Run each and confirm:
- `npx tsc --noEmit` → no errors
- `npm run lint` → no errors
- `npm test` → every test passes **except** exactly the 6 in `src/lib/map/path.test.ts`, each failing with `not implemented`
- `npm run e2e` → 7 passed
- `npm run build` → succeeds
- Manual: open `/demo` at phone width (browser dev tools, 375px). The Itinerary/Map toggle shows and hides each panel and the controls are at least 44px tall.

- [ ] **Step 6: Commit**

```bash
git add -A -- . ':!.DS_Store'
git commit -m "test: Playwright demo flows; docs: README for the skeleton (DEMO-1, DEMO-2, UX-2)"
```

- [ ] **Step 7 (owner action, not an agent task): Deploy**

Push the repo and import it in Vercel (or run `npx vercel`). No environment variables are needed for the skeleton. Confirm `/demo` loads on the live URL. This is outward-facing, so the owner does it.

---

## Self-review (completed)

- **Spec coverage:** tooling → T1; types and schemas → T2; repository seam, `DemoRepository`, provider and hooks → T7, T8; pure modules with PRD-derived tests → T3-T6; store → T9; workspace layout (header, budget, range, itinerary, detail card, lazy map, mobile toggle) → T10; routes and placeholders → T11; demo seed (DEMO-4 content) → T7; "done when" items (dev server, range filter, tests, Playwright smoke, deploy) → T11-T12.
- **Deliberate deviations from the spec's wording:** `time`, `budget`, `ordering` are fully implemented rather than stubbed, because the demo's done-criteria need them and they are small. Only `buildPath` and `arcPoints` are stubs with intentionally failing tests. The stub/fail behavior matches the spec's "anything not yet implemented fails visibly". `/` does not redirect logged-in users to `/trips` (no auth yet, AUTH-3 route protection is out of scope per the spec).
- **Placeholders:** none. The three repeated placeholder pages in Task 11 Step 2 differ only in the component name and title, both given.
- **Type consistency:** `Repository` method names, `moveItem(id, day, position)`, `useWorkspace` fields (`selectedItemId`, `range`, `select`, `setRange`, `reset`), `visibleItems(items, {start,end})`, `summarize(items, totalBudget)` and the accessible names used by Playwright were checked against their definitions in earlier tasks.
