# Tripboard

A travel planning web app: one trip workspace with a day-by-day itinerary, a map companion and a budget summary.

**Status: working demo and accounts.** `/demo` runs the trip workspace end to end on a seeded, in-memory trip (Japan 2027): day-by-day itinerary, item details (a bottom sheet on phones), date range filter, budget summary, adding, editing, duplicating and deleting flights, stays and activities, collapsible days, drag and drop within and between days (mouse, touch and keyboard) with a "Move to day" fallback, and a Leaflet map with numbered pins, route lines and flight arcs that stays in sync with the itinerary. It includes system dark mode, readable city-based time zone labels, spending totals by item type and a text warning when a trip is over budget. Changes reset on refresh. Signed-in users get the same workspace on Supabase: email/password authentication, upcoming and past trip groups, and trip creation, editing and deletion. Row Level Security keeps every trip private to its owner, and the account data contract runs end to end against a dedicated Supabase test account.

## Screenshots

![Tripboard landing page with the demo call to action and Japan 2027 route overview](docs/screenshots/landing-page.png)

### Demo workspace

![Tripboard desktop workspace in light mode with a selected flight's details beside the route map](docs/screenshots/demo-desktop-light.png)

![Tripboard desktop workspace in dark mode with a selected flight's details beside the route map](docs/screenshots/demo-desktop-dark.png)

### Phone views

| Itinerary | Map |
|---|---|
| ![Tripboard phone itinerary showing the budget and first trip days](docs/screenshots/demo-phone-itinerary.png) | ![Tripboard phone map view showing the day legend and route map](docs/screenshots/demo-phone-map.png) |

## Stack

- Next.js 16 App Router, React 19 and TypeScript
- Tailwind CSS 4 with shadcn-style primitives built on Base UI
- Supabase Postgres and Auth behind a shared repository interface
- TanStack Query for server data and optimistic updates
- React Hook Form and Zod for forms and validation
- dnd-kit for sortable itinerary items
- Leaflet and react-leaflet for maps; Luxon for dates and time zones
- Vitest for logic and repository tests; Playwright for browser flows

UI state stays in React components. Zustand was dropped because it was unused.

## Run

    npm install
    npm run dev        # http://localhost:3000
    npm test           # Vitest
    npm run e2e        # Playwright (starts the dev server)
    npx next typegen   # generates route types (e.g. LayoutProps) so `tsc --noEmit` passes before a build

Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key (Project Settings → API Keys). Without them the demo still works, and the account pages say accounts are unavailable.

The database schema lives in `supabase/migrations/`. `supabase/tests/rls_isolation.sql` checks that one user can't read or change another user's trips (AUTH-5): paste it into the Supabase SQL Editor, it rolls itself back. `npm test` also runs the repository contract against Supabase when `.env.local` has `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` for a dedicated test account (it deletes that account's trips afterwards), and skips it otherwise. `e2e/account.spec.ts` uses the same account to drive the signed-in flows in a browser (it deletes only the trips it creates); its sign-up test registers a throwaway `tripboard-e2e-…@example.com` user on each run.


## Layout

    docs/                       product docs (overview, PRD, technical) and design/plan notes
    e2e/                        Playwright tests (landing, sign-in checks, demo flows)
    supabase/seed/demo-trip.json  the demo trip, sparse (omitted columns default via itemDefaults)
    src/app/                    routes: landing, /demo, /login, /signup, /trips, /trips/[tripId]
    src/components/             trip, itinerary (cards, details, item form and dialogs), budget, map; primitives in ui/
    src/lib/data/               Repository interface, in-memory DemoRepository, SupabaseRepository, provider, query hooks, shared contract test
    src/lib/supabase/           Supabase clients for the browser and the server (src/proxy.ts refreshes the session)
    supabase/migrations/        schema, constraints and Row Level Security
    src/lib/{time,budget,ordering,map}/   pure, tested logic (no date, money or ordering math in components)
    src/lib/items/              item form: validation, form <-> item conversion, placement, default time zone
    src/test/                   test factories
    src/types/                  Zod schemas and inferred types

`src/components/ui/` follows shadcn/ui conventions. `dialog`, `alert-dialog`, `input` and `label` were written by hand on top of `@base-ui/react` because the shadcn registry was unreachable when they were added; `npx shadcn add` can replace them later.

Config files (`next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `components.json`, ...) stay at the root where the tools expect them. `AGENTS.md` and `CLAUDE.md` were generated by `create-next-app`.

## Future work

- Deploy the app and complete M6, using a production tile provider instead of OpenStreetMap's standard development tile server. Configure it with `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION`.
- Add Google sign-in (AUTH-4, P1).
- Add optional place search (GEO-1, P2) after choosing a provider and checking its current terms and pricing.
- V2: import confirmation PDFs or screenshots into reviewable draft items, attach the source document and detect duplicates.
- V3: add travel-time and schedule warnings, free-time blocks, an installable web app and privacy-aware read-only sharing.
- Later: collaboration, expense splitting, recommendations, real routes, email import, a during-trip mode and a native app.
