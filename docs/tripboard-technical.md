# Tripboard: Technical Document

This document covers the stack, architecture, data model, and key technical decisions. The product requirements live in `tripboard-prd.md`, and the high-level idea lives in `tripboard-overview.md`.

## 1. Guiding Constraints

- Target a V1 in about 1 to 2 weeks (a target, not a deadline), so favor boring, well-documented tools
- Keep running costs at or near $0 for a portfolio-scale app
- One codebase, no separate backend service in V1
- Web first. The layout must work well on a phone browser, a native app is a possible future step
- Leave clean room for V2 (AI document import) without rewrites

## 2. Stack

| Area | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) with TypeScript | One codebase for UI and small server pieces, easy deploys |
| Styling | Tailwind CSS and shadcn/ui | Fast to build a polished, consistent UI |
| Database | Supabase (Postgres) | Relational data fits trips and items, bundled with auth and storage |
| Auth | Supabase Auth (email and password, Google as optional) | No custom auth code |
| File storage (V2) | Supabase Storage | Same platform, used for uploaded confirmations |
| Data fetching | TanStack Query | Caching and optimistic updates, needed for drag and drop |
| UI state | Zustand | Small shared store for selected item and date range |
| Forms and validation | React Hook Form and Zod | Typed forms, shared schemas |
| Drag and drop | dnd-kit | Touch support, works with sortable lists |
| Map | Leaflet via react-leaflet | Simple, free, easy custom markers and polylines |
| Dates and time zones | Luxon (or date-fns-tz) | Reliable IANA time zone handling |
| Testing | Vitest for logic, Playwright for a few end-to-end flows | Test the risky logic, not everything |
| Hosting | Vercel (app) and Supabase (data) | Free tiers cover this scale |

If a choice turns out to be a poor fit, swapping it should be possible because data access and the map sit behind small modules (see section 4).

## 3. Architecture

```
Browser (Next.js, React)
  |-- UI components (itinerary, map, budget, forms)
  |-- Zustand store (selected item, date range, view mode)
  |-- TanStack Query (server data cache, optimistic updates)
  |-- Data layer (repository interface)
        |-- SupabaseRepository  -> Supabase Postgres (with Row Level Security)
        |-- DemoRepository      -> in-memory seed data, no network
```

Key point: the UI never talks to Supabase directly. It calls a repository interface (`getTrips`, `createItem`, `moveItem`, and so on). There are two implementations: one for real accounts and one for demo mode that runs entirely from local seed data. This makes the demo work with no signup and no database, so it keeps working even if the free database is paused.

V1 needs no custom API routes. V2 adds one server route that calls the AI model, so the API key stays on the server.

## 4. Suggested Project Structure

```
src/
  app/
    page.tsx                  Landing page, redirects logged-in users to /trips
    login/ signup/            Auth pages
    trips/page.tsx            Trip list (dashboard)
    trips/[tripId]/page.tsx   Trip workspace (itinerary + map + budget)
    demo/page.tsx             Demo trip, no account needed
  components/
    ui/                       shadcn/ui primitives
    trip/                     Trip cards, trip form, header
    itinerary/                Day columns, item cards, item form, detail card
    map/                      Map, pins, connecting lines
    budget/                   Budget summary
  lib/
    data/                     Repository interface and both implementations
    supabase/                 Supabase client helpers
    time/                     Time zone and date helpers
    budget/                   Budget calculation (pure functions)
    ordering/                 Position math for drag and drop
    map/                      Path building, arc generation, day colors
  stores/                     Zustand stores
  types/                      Shared TypeScript types and Zod schemas
supabase/
  migrations/                 SQL migrations, source of truth for the schema
  seed/                       Demo trip data (also used by DemoRepository)
```

## 5. Data Model

Authentication users come from Supabase (`auth.users`), so there is no custom users table in V1.

### `trips`

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | default `gen_random_uuid()` |
| user_id | uuid, not null | references `auth.users`, owner |
| name | text, not null | |
| start_date | date, not null | |
| end_date | date, not null | must be on or after start_date |
| destinations | text[] | default empty array |
| currency | text, not null | ISO 4217 code, default `USD` |
| total_budget | numeric(12,2) | nullable |
| created_at, updated_at | timestamptz | |

### `itinerary_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | |
| trip_id | uuid, not null | references `trips`, cascade delete |
| type | text, not null | check in (`flight`, `stay`, `activity`) |
| title | text, not null | |
| notes | text | |
| day | date, not null | The trip day the item is shown on (check-in day for stays) |
| is_flexible | boolean, not null | default false. True means the day is known but not the time |
| start_at | timestamptz | nullable for flexible items, stored in UTC |
| end_at | timestamptz | nullable |
| start_timezone | text | IANA name, for example `Asia/Tokyo` |
| end_timezone | text | IANA name, can differ for flights |
| start_location_name | text | |
| start_address | text | |
| start_lat, start_lng | double precision | nullable, needed to show a pin |
| end_location_name, end_address | text | used by flights |
| end_lat, end_lng | double precision | used by flights |
| estimated_cost | numeric(12,2) | nullable |
| actual_cost | numeric(12,2) | nullable |
| status | text, not null | Booking status. Check in (`idea`, `planned`, `reserved`), default `planned` |
| payment_status | text, not null | check in (`unpaid`, `paid`), default `unpaid` |
| confirmation_number | text | |
| position | double precision, not null | order within a day |
| metadata | jsonb, not null | default `{}`, type-specific extras |
| created_at, updated_at | timestamptz | |

Index: `(trip_id, day, position)`.

Check constraint: `payment_status <> 'paid' OR status = 'reserved'`. A paid item is always a reserved item, so it always counts in budget totals.

Locations stay inside the item rows in V1 to avoid a third table. If place reuse becomes valuable later, a `locations` table can be introduced with a migration.

### `metadata` examples

- Flight: `{ "airline": "ANA", "flight_number": "NH105", "seat": "32A", "terminal": "B" }`
- Stay: `{ "room": "Double", "booking_provider": "Booking.com" }`
- Activity: `{ "category": "restaurant", "ticket_info": "Timed entry" }`

### V2 table (not built in V1)

`documents`: id, trip_id, itinerary_item_id (nullable), storage_path, file_type, extraction_status, created_at.

### Row Level Security

- `trips`: a user can select, insert, update, and delete only rows where `user_id = auth.uid()`
- `itinerary_items`: allowed only when the parent trip belongs to `auth.uid()` (policy checks through `trip_id`)
- Never rely on client-side filtering for access control

## 6. Key Technical Decisions

### Time and time zones
- Store `start_at` and `end_at` as UTC `timestamptz`, with the IANA time zone name saved alongside
- Display times in the time zone of the place (the flight departure uses `start_timezone`, arrival uses `end_timezone`)
- Flexible items store only `day`, with null times
- All conversion happens through one helper module so no component does its own date math
- Overnight flights are a required test case (departure on one day, arrival on the next, across time zones)

### Ordering and drag and drop
- Within a day, order is defined by `position` (a double), not by clock time
- New timed items are inserted by start time among existing items, and the user can then drag freely
- Dropping an item between two neighbors sets its position to the midpoint of theirs, so only one row is updated
- If gaps get too small (neighbors closer than a tiny epsilon), renumber that day's positions
- Moving an item to another day updates `day`, keeps the local clock time, and adjusts the date part of `start_at` and `end_at` in the item's time zone
- Drag and drop updates the UI optimistically, then saves, then rolls back with an error message if saving fails

### Booking status and payment status
- `status` (idea, planned, reserved) says how firmly the item is planned. `payment_status` (unpaid, paid) says whether it has been paid. They are independent, so an item can be reserved and unpaid, or reserved and paid
- Marking an idea or planned item as paid sets its `status` to `reserved` in the same update
- Lowering a paid item's `status` below reserved is blocked until it is marked unpaid
- Partial payments are out of scope for V1 and can be added later with a paid amount field

### Budget calculation (pure functions, never stored)
- Items with status `idea` are excluded from totals
- Item cost = `actual_cost` if present, otherwise `estimated_cost`, otherwise 0
- Estimated trip cost = sum of item cost for statuses `planned` and `reserved`
- Paid = sum of item cost where `payment_status` is `paid`
- Remaining expected spending = estimated trip cost minus paid
- Budget remaining = `total_budget` minus estimated trip cost (hidden if no budget set)
- All amounts are in the trip currency. No conversion in V1

### Shared selection and date range
- One Zustand store holds `selectedItemId` and `range` (start day, end day)
- Itinerary and map both read from it. Clicking either one writes to it
- The visible items list is derived: items whose `day` falls in the range, ordered by day then position

### Map behavior
- Leaflet runs only in the browser, so the map component must be loaded client-side only (dynamic import with SSR disabled)
- Pins are numbered by visit order within the visible range and colored by day (a palette of 8 colors that cycles)
- Each item contributes an entry point (start location) and an exit point (end location, or the start location if there is no end)
- A line connects the previous item's exit point to the next item's entry point
- Flights draw as a curved arc between departure and arrival. A simple quadratic curve is enough, no routing service
- Stays render as a single pin
- Items without coordinates appear in the itinerary but not on the map
- Selecting a pin selects the item, and selecting an item pans the map to it

### Place search (optional in V1)
- V1 works with manual location entry. Place search with autocomplete is a convenience that can be added later
- Provider options: MapTiler geocoding (free plan is limited to non-commercial use, includes autocomplete), Mapbox (free temporary geocoding, but storing coordinates counts as paid permanent geocoding), Google Places (free monthly allowance per API)
- Do not use the public Nominatim service for autocomplete, its usage policy forbids it
- Whichever provider is chosen sits behind a small `lib/map/geocode.ts` module so it can be swapped
- Verify current pricing and terms before choosing, they change

### Demo mode
- The `/demo` route uses `DemoRepository` loaded from the seed JSON
- Edits work in memory and reset on refresh, nothing is written to the database
- The seed file is also used to seed a real account if wanted

## 7. Third-Party Services and Costs

| Service | Plan | Cost | Notes |
|---|---|---|---|
| Vercel | Hobby | $0 | Intended for personal, non-commercial projects |
| Supabase | Free | $0 | 500 MB database, 1 GB file storage, 50,000 monthly active users. Projects pause after one week of inactivity |
| Map tiles | Free tier of a tile provider | $0 | Check the provider's terms. Always include attribution |
| Domain | Optional | About $10 to $15 per year | |
| AI model API (V2) | Pay as you go | A fraction of a cent per document | API key kept server-side only |

### Free database pausing
Free Supabase projects pause after a week of inactivity. V1 does not work around this. Demo mode does not depend on the database, so the public demo keeps working while the project is paused. The landing page leads with the demo as the main call to action. If sign-in or data requests fail because the database is unavailable, show a friendly error message that points to the demo. Restoring a paused project is done from the Supabase dashboard. If the app gets real users, move to a paid plan.

## 8. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never sent to the browser
NEXT_PUBLIC_MAP_TILE_URL=         # tile provider URL with key if needed
# V2
AI_API_KEY=                       # server only
```

Rules: never commit `.env` files, commit an `.env.example` with empty values, and never expose the service role key or AI key to client code.

## 9. Testing Approach

Focus tests on the parts most likely to break:

- **Unit (Vitest):** budget calculation (including the rule that marking an item paid makes it reserved), position math (midpoint, renumber), time zone conversion including overnight flights, map path building, day color assignment
- **End to end (Playwright), a small set:** sign up and create a trip, add each item type, drag an item to another day, date range filtering updates itinerary and map, budget summary changes when a cost, booking status, or payment status changes, demo page loads without login
- Manual check on a real phone for touch drag and drop and layout

## 10. Performance, Accessibility, Security

- Keep trip item queries to one request per trip (fetch all items for the trip, filter by range on the client)
- Lazy-load the map so the itinerary renders first
- Use semantic HTML, keyboard-accessible controls, visible focus states, and sufficient color contrast. Do not rely on color alone to convey status or day (add labels or numbers)
- Validate all input with Zod on the client and again on any server route
- Row Level Security on every table, and test that one user cannot read another user's trip

## 11. V2 Preview: Confirmation Import

Not part of V1 but the V1 design should not block it.

Flow: upload file, store in Supabase Storage, send to an AI model with a structured output schema matching the item fields, return a draft item, show a review screen, user confirms, create the item and link the document.

Hooks already in V1 for this: the generic item model, the `metadata` JSON field, and the `confirmation_number`, cost, and time zone fields. Duplicate detection can match on confirmation number, date, and route.

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Drag and drop is flaky on touch screens | Test on a real phone early, add a "move to day" menu as a fallback |
| Time zone bugs on overnight flights | Single time helper module, dedicated unit tests |
| Map library breaks under server rendering | Client-only dynamic import |
| Free database is paused and sign-in fails | Demo mode runs without the database, the landing page leads with the demo, show a friendly error, restore the project from the Supabase dashboard |
| Scope creep | Follow the PRD scope list, defer anything marked P2 or later |
| Costs creep up through a geocoding provider | Keep place search optional, verify pricing before enabling |
| Timeline slips past 2 weeks | Treat 2 weeks as a target. Cut P1 items first, keep the move-to-day menu and the time zone tests, do not trade away quality to hit a date |
