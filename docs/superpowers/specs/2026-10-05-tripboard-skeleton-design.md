# Tripboard MVP Skeleton: Design

Date: 2026-10-05. Source docs: `docs/tripboard-overview.md`, `docs/tripboard-prd.md`, `docs/tripboard-technical.md`. Where this spec and those disagree, flag it, do not guess (PRD §0 rule 2).

## Intent

Portfolio-grade V1 in about 1-2 weeks. A recruiter opens `/demo` and understands it in under a minute. The skeleton is a repo that runs and deploys with every architectural seam in place and no real feature logic behind it, so feature work fills it in instead of restructuring it.

**Build order: demo-first.** The one working end-to-end path is `/demo`, rendered from `DemoRepository`, the Zustand store and the pure `lib/` functions. All UI, drag and drop, and map work is built against the demo. The owner adds Supabase, auth and RLS afterward, behind the same repository interface.

## In scope for the skeleton

1. **Tooling.** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Vitest, Playwright, `.env.example`. One smoke test each for Vitest and Playwright. Deployable to Vercel.
2. **Types and schemas** (`src/types/`). Zod schemas for `Trip` and `Item` matching the technical doc §5, with TS types inferred from them. The `payment_status = paid ⇒ status = reserved` rule and `end_at >= start_at` are encoded in the schema.
3. **Repository seam** (`src/lib/data/`).
   - `Repository` interface: `getTrips`, `getTrip`, `createTrip`, `updateTrip`, `deleteTrip`, `getItems(tripId)`, `createItem`, `updateItem`, `deleteItem`, `moveItem`. All async.
   - `DemoRepository`: real, in-memory, seeded from `supabase/seed/demo-trip.json`. Mutations live in memory and reset on refresh.
   - A `RepositoryProvider` React context supplies the implementation. `/demo` provides `DemoRepository`. `/trips/*` has no provider yet, so the owner's Supabase implementation plugs in there.
   - TanStack Query hooks (`useTrip`, `useItems`, and mutations) are the only thing components call.
4. **Pure `lib/` modules with tests.** `budget/`, `ordering/`, `time/`, `map/` (path building, arcs, day colors). Function signatures plus tests taken from the PRD: the 3,000 budget example (§4.6), midpoint and renumber ordering, and the overnight cross-time-zone flight (LAX to Tokyo). The tests are the checklist the implementations fill in. Components never do date, money or ordering math.
5. **Zustand store** (`src/stores/`). `selectedItemId`, `range`, and a derived `visibleItems` selector (items whose `day` is in range, ordered by day then position).
6. **Routes and shells.**
   - `/`: landing page with "Try the demo" as the main call to action.
   - `/demo`: the real workspace with the demo banner.
   - `/login`, `/signup`, `/trips`, `/trips/[tripId]`: static placeholders that say "backend not connected yet" and link to `/demo`.
7. **Workspace layout** (`components/`, shared by `/demo` and later `/trips/[tripId]`). Header, budget summary, date range control, itinerary column (day sections, item cards), detail card, and a map placeholder loaded via `dynamic(..., { ssr: false })`. Desktop is two columns. Mobile is a single column with an Itinerary/Map toggle. Components start as thin shells that read from the store and hooks, and each PRD milestone fills one in.
8. **Demo seed.** `demo-trip.json` per DEMO-4: Los Angeles to Tokyo, Kyoto and back. All three item types, mixed booking and payment statuses, costs, one flexible item, one overnight cross-time-zone flight, a total budget.

## Out of scope for the skeleton

- Supabase client code, `SupabaseRepository`, auth, middleware route protection, and SQL migrations/RLS. The owner builds these. The interface and the `.env.example` keys are the hand-off point.
- All P0 feature behavior beyond what the demo path needs: forms, drag and drop, real map rendering, budget polish. These are the M2-M6 fill-in work.
- Everything the PRD lists as out of scope for V1.

## Structure

As in technical doc §4, minus `lib/supabase/` and `supabase/migrations/` for now. `supabase/seed/` stays because the demo reads from it.

## Risks

- **Auth and RLS validated late.** Mitigated by the repository seam. Run the cross-user RLS test (AUTH-5) when the backend lands.
- **Demo and real data diverge.** Both implementations must pass one shared repository contract test.
- **Touch drag and drop.** Still needs a real-phone check early in M3, with the "move to day" menu (ITIN-7) as the fallback.

## Done when

- `npm run dev` serves `/` and `/demo`, and `/demo` renders the seeded trip in the day-by-day layout with the budget summary computed from the pure functions.
- Selecting an item updates the store and the detail card. The date range control filters the itinerary.
- `vitest` runs the `lib/` tests and the repository contract test against `DemoRepository`. Anything not yet implemented fails visibly.
- One Playwright smoke test (`/demo` loads without login) passes.
- It deploys to Vercel.
