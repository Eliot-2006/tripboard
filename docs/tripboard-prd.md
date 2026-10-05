# Tripboard: Product Requirements Document (V1)

## 0. How to Use This Document

This PRD is the shared source of truth for building Tripboard V1. It combines the product intent and the technical details so every contributor, human or AI agent, works toward the same result.

Related documents:
- `tripboard-overview.md`: the idea in plain language
- `tripboard-technical.md`: stack, architecture, data model, and technical decisions

Rules for contributors:
1. Build only what is marked in scope for V1. Priorities: **P0** must ship, **P1** should ship if time allows, **P2** nice to have, defer by default.
2. When this document and the technical document disagree, stop and flag it instead of guessing.
3. If a requirement is ambiguous, pick the simplest reasonable interpretation, note the assumption in the PR description, and move on.
4. Do not add libraries or services that are not in the technical document without a clear reason.
5. Every requirement has an ID (for example `ITEM-3`). Reference IDs in commits and PRs.

## 1. Product Summary

Tripboard is a travel planning web app. A user creates a trip, adds flights, stays, and activities with times, locations, costs, and booking status, and sees everything in a clean day-by-day itinerary. A map companion shows all stops as numbered pins connected in order. A budget summary tracks estimated cost, amount paid, and what remains.

The itinerary is the product. The map is a visual companion that stays in sync.

## 2. Users and Key Scenarios

**Primary user: the trip planner.** Someone organizing a trip who is tired of juggling emails, screenshots, and a Google Doc.

**Secondary user: the reviewer.** A recruiter or engineer who opens the live demo and wants to understand the product within a minute.

Key scenarios:
1. Create a "Japan 2027" trip with dates and a $3,000 budget
2. Add a flight (LAX to Tokyo), a hotel stay, and several activities
3. Mark the flight as reserved and paid and the hotel as reserved and unpaid, and see the budget summary update
4. Drag an activity from Tuesday to Wednesday
5. Narrow the date range to Wednesday and Thursday and see the itinerary and map update
6. Open the app on a phone at the airport and quickly find today's plan and a confirmation number
7. A reviewer opens `/demo` and explores a pre-filled trip with no signup

## 3. Scope

### In scope for V1
Accounts, trips, three item types, itinerary view with drag and drop, date range control, map with pins and lines, per-item costs and status, budget summary, responsive layout, demo mode, deployment.

### Out of scope for V1 (do not build)
Document upload and AI import (V2), travel time and conflict warnings (V3), sharing links, collaboration, expense splitting, recommendations, notifications, live flight data, booking or payments, multi-currency conversion, email import, native mobile app, offline mode.

## 4. Functional Requirements

### 4.1 Authentication

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| AUTH-1 | P0 | Sign up with email and password | New user can register and lands on the trip list |
| AUTH-2 | P0 | Log in and log out | Session persists across refresh. Logging out returns to the landing page |
| AUTH-3 | P0 | Protected routes | Visiting `/trips` while logged out redirects to login. `/demo` stays public |
| AUTH-4 | P1 | Sign in with Google | Works through Supabase OAuth |
| AUTH-5 | P0 | Data isolation | One user cannot read or change another user's trips (enforced by Row Level Security and verified by a test) |

### 4.2 Trips

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| TRIP-1 | P0 | Trip list page showing the user's trips as cards | Each card shows name, destinations, date range, and a budget or progress hint. Empty state explains how to create a trip |
| TRIP-2 | P0 | Create a trip | Fields: name (required), start date, end date, destinations (optional, multiple), currency (default USD), total budget (optional). End date cannot be before start date |
| TRIP-3 | P0 | Edit a trip | All TRIP-2 fields editable. If dates shrink and items fall outside the new range, warn the user before saving |
| TRIP-4 | P0 | Delete a trip | Requires confirmation. Deletes all its items |
| TRIP-5 | P1 | Trip cards separate upcoming and past trips | Based on end date versus today |
| TRIP-6 | P0 | Opening a trip goes to the trip workspace | URL `/trips/[tripId]` |

### 4.3 Itinerary Items

Item types: `flight`, `stay`, `activity` (restaurants are activities with `metadata.category = "restaurant"`).

Common fields on every item: title (required), day, notes, booking status, payment status, estimated cost, actual cost, confirmation number, location.

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| ITEM-1 | P0 | Add item via an "Add to trip" action with a type picker | Choosing a type opens a form with that type's fields. Saved item appears in the itinerary immediately |
| ITEM-2 | P0 | Flight form | Departure and arrival location, departure and arrival date and time with a time zone each, airline, flight number (stored in metadata), plus common fields. Arrival can be on a later day than departure |
| ITEM-3 | P0 | Stay form | Name, address or location, check-in date and time, check-out date and time, plus common fields. Shown as one item with one pin |
| ITEM-4 | P0 | Activity form | Title, location, start time and duration or end time (optional), category (activity or restaurant), plus common fields |
| ITEM-5 | P0 | Flexible items | A toggle "No exact time" saves only the day. These items show an "Anytime" label |
| ITEM-6 | P0 | Edit and delete items | Edit opens the same form prefilled. Delete asks for confirmation |
| ITEM-7 | P0 | Booking status and payment status | Two separate fields. Booking status: idea, planned, reserved (default planned). Payment status: unpaid, paid (default unpaid). Each shows as a text badge (not color alone). Marking an item paid sets its booking status to reserved if it was lower. A paid item's booking status cannot be lowered until it is marked unpaid |
| ITEM-8 | P0 | Costs | Estimated cost and actual cost, both optional, in the trip currency. Validation rejects negative numbers |
| ITEM-9 | P0 | Confirmation number and notes | Plain text, optional, visible in the detail card |
| ITEM-10 | P0 | Location entry | A user can type a location name and address and enter or pick coordinates. See 4.7 for the optional place search. Items without coordinates are allowed |
| ITEM-11 | P1 | Time zone default | New items default to the time zone of the previous item or the trip's first destination if known. The user can change it |
| ITEM-12 | P1 | Duplicate an item | Creates a copy on the same day |

Business rules:
- `end_at` must not be before `start_at`
- A paid item is always reserved (`payment_status = paid` requires `status = reserved`). The database enforces this with a check constraint and the UI applies it automatically
- Partial payments are not supported in V1
- A timed item's `day` must match the local date of `start_at` in its time zone when created. Moving the item between days later is the exception (see ITIN-6)
- Stays shown on later days (between check-in and check-out) appear as a compact "Staying at [name]" row, derived from the stay, not stored separately (P1, see ITIN-8)

### 4.4 Itinerary View

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| ITIN-1 | P0 | Day-by-day layout | Each day in the visible range is a section with a date heading and its items in order |
| ITIN-2 | P0 | Item card | Shows type icon, title, time (or "Anytime"), location name, status badge, paid indicator, and cost. Tapping or clicking selects the item |
| ITIN-3 | P0 | Detail card | Selecting an item reveals full details: times with time zones, address, costs, confirmation number, notes, and Edit and Delete actions. On desktop it appears in a side panel or expanded card, on mobile in a bottom sheet |
| ITIN-4 | P0 | Date range control | Controls: "Whole trip", single day, or a start and end day. Itinerary and map both update. The default is whole trip |
| ITIN-5 | P0 | Reorder within a day by drag and drop | Order persists after refresh. Works with mouse and touch |
| ITIN-6 | P0 | Move between days by drag and drop | Dropping on another day updates its day. For timed items the clock time stays the same and the date shifts. The UI updates immediately and rolls back with an error if saving fails |
| ITIN-7 | P1 | "Move to day" menu on each card | Fallback for touch screens and accessibility, offers the days in the trip |
| ITIN-8 | P1 | Stay continuation rows | Days between check-in and check-out show a compact "Staying at" row |
| ITIN-9 | P0 | Empty day state | A day with no items shows an "Add something" prompt |
| ITIN-10 | P0 | New timed items are placed by start time | When added, a timed item is inserted among existing items by time. The user can drag to change the order afterward |
| ITIN-11 | P1 | Collapse and expand days | Each day section can collapse |

Ordering model: items within a day are ordered by `position`. Clock times do not force order after the user drags. See the technical document for position math.

### 4.5 Map

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| MAP-1 | P0 | Show a pin for each visible item that has coordinates | Pins respect the date range |
| MAP-2 | P0 | Pins are numbered in visit order and colored by day | Number matches order in the visible range. A legend or day labels explain colors. Color is not the only signal (numbers and labels are present) |
| MAP-3 | P0 | Connecting lines between consecutive stops | A line joins each item's exit point to the next item's entry point. Flights draw as curved arcs between departure and arrival |
| MAP-4 | P0 | Two-way selection | Clicking a pin selects the item in the itinerary and scrolls to it. Selecting an item highlights its pin and pans the map |
| MAP-5 | P0 | Fit to visible items | When the date range changes, the map zooms to fit visible pins |
| MAP-6 | P0 | Items without coordinates | Appear in the itinerary, absent from the map, and show a small "no map location" hint in the detail card |
| MAP-7 | P0 | Map attribution | Required attribution text is visible |
| MAP-8 | P0 | Lazy loading | Itinerary renders without waiting for the map |
| MAP-9 | P1 | Stays show as a single pin | Even across several days |

### 4.6 Budget

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| BUD-1 | P0 | Budget summary on the trip workspace | Shows total budget, estimated trip cost, paid, remaining expected spending, and budget remaining |
| BUD-2 | P0 | Calculation rules | Follow the rules below exactly |
| BUD-3 | P0 | Live updates | Changing a cost, status, or deleting an item updates the summary immediately |
| BUD-4 | P0 | No budget set | If `total_budget` is empty, hide the "budget remaining" figure and still show the other numbers |
| BUD-5 | P1 | Over-budget indication | If estimated cost exceeds the budget, show the remaining amount as negative with a text warning (not color only) |
| BUD-6 | P1 | Spending by type | A small breakdown by flights, stays, and activities (this replaces user-defined categories in V1) |

Calculation rules (apply to all items in the trip, not just the visible range):
- Items with booking status `idea` are excluded
- Item cost = `actual_cost` if set, otherwise `estimated_cost`, otherwise 0
- Estimated trip cost = sum of item cost for booking statuses planned and reserved
- Paid = sum of item cost where payment status is paid
- Remaining expected spending = estimated trip cost minus paid
- Budget remaining = total budget minus estimated trip cost

Example: budget 3,000. Flight reserved and paid 872, hotel reserved and unpaid 760, activities planned and unpaid 184. Estimated cost 1,816, paid 872, remaining expected 944, budget remaining 1,184.

### 4.7 Place Search (optional)

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| GEO-1 | P2 | Search for a place by name and fill in the location and coordinates | Behind a swappable `geocode` module. Manual entry always remains available |

Provider is undecided. See the technical document for options and cost notes. Do not build this until the P0 and P1 items are done.

### 4.8 Demo Mode

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| DEMO-1 | P0 | Public `/demo` route with a pre-filled trip | Loads without login and without database calls |
| DEMO-2 | P0 | Demo is fully interactive | Users can select items, change the date range, drag items, and edit. Changes live in memory and reset on refresh |
| DEMO-3 | P0 | Clear demo banner with a sign-up call to action | Banner tells the user this is sample data |
| DEMO-4 | P0 | Demo trip content | A believable multi-city trip (for example Los Angeles to Tokyo, Kyoto, and back) with all three item types, mixed booking and payment statuses, costs, a flexible item, an overnight flight across time zones, and a total budget |

### 4.9 Responsive Design and UX

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| UX-1 | P0 | Desktop layout | Itinerary and map side by side |
| UX-2 | P0 | Mobile layout | Single column. Map and itinerary are switchable (tabs or a toggle), detail card is a bottom sheet. Tap targets are at least 44 px |
| UX-3 | P0 | Loading, empty, and error states | Every data view has all three |
| UX-4 | P0 | Form validation messages | Clear, specific, shown next to the field |
| UX-5 | P1 | Dark mode | Follows system preference |
| UX-6 | P0 | Visual polish | Consistent spacing, typography, and iconography per item type. Should look noticeably cleaner than a Google Doc |

### 4.10 Non-Functional Requirements

| ID | Priority | Requirement |
|---|---|---|
| NFR-1 | P0 | Trip workspace loads in under 3 seconds on a normal connection for a trip with 50 items |
| NFR-2 | P0 | All writes are validated with Zod and protected by Row Level Security |
| NFR-3 | P0 | No secrets in client code or the repository. `.env.example` is provided |
| NFR-4 | P0 | Keyboard accessible controls, visible focus, semantic HTML, sufficient contrast |
| NFR-5 | P0 | Works in current versions of Chrome, Safari, and Firefox, and on mobile Safari and Chrome |
| NFR-6 | P0 | If the database or sign-in is unavailable (for example a paused free project), the app shows a friendly error and points users to the demo |

## 5. Screens

1. **Landing page (`/`)**: short pitch, "Try the demo" as the main call to action, then sign up and log in. Logged-in users are redirected to `/trips`
2. **Auth pages (`/login`, `/signup`)**
3. **Trip list (`/trips`)**: trip cards, "New trip" button, empty state
4. **Trip workspace (`/trips/[tripId]`)**: header (name, dates, edit), date range control, budget summary, itinerary, map, detail card, "Add to trip" action
5. **Trip form**: modal or page for create and edit
6. **Item form**: type-specific, modal or drawer
7. **Demo (`/demo`)**: same workspace as screen 4 with demo data and a banner

Trip workspace layout, desktop:
```
+-----------------------------------------------------------+
| Trip name, dates                          [Edit] [Add]    |
| Budget summary                                            |
| Date range control: [Whole trip] [Day] [Start - End]      |
+---------------------------+-------------------------------+
| Itinerary (scrollable)    | Map                           |
|  Day 1 ...                |                               |
|  Day 2 ...                |                               |
|  (detail card on select)  |                               |
+---------------------------+-------------------------------+
```
Mobile: header and budget on top, then a toggle between Itinerary and Map, detail card as a bottom sheet.

## 6. Data Model Summary

Two tables in V1: `trips` and `itinerary_items`. Full column definitions, constraints, indexes, and Row Level Security rules are in `tripboard-technical.md` section 5. Do not add tables or columns without updating that document.

Key points:
- Times stored as UTC with an IANA time zone saved alongside
- `status` is the booking status: idea, planned, or reserved
- `payment_status` is separate: unpaid or paid. A paid item must be reserved (check constraint)
- `position` (double) orders items within a day
- `metadata` (jsonb) holds type-specific extras such as flight number, seat, and room
- Locations live inside the item row in V1

## 7. Technical Constraints Summary

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- Supabase (Postgres and Auth), TanStack Query, Zustand, React Hook Form, Zod
- dnd-kit for drag and drop, Leaflet via react-leaflet for the map, Luxon for time zones
- UI talks to a repository interface with a Supabase implementation and a demo implementation
- Leaflet loaded client-side only
- Deployed to Vercel with Supabase for data
- Full details in `tripboard-technical.md`

## 8. Milestones and Definition of Done

Target: about 1 to 2 weeks. This is a target, not a deadline. If the work runs long (drag and drop on touch, time zones, map sync, and responsive polish are the likely causes), cut P1 items first and keep going until the P0 requirements meet their acceptance criteria. Do not trade away quality to hit a date. The move-to-day menu (ITIN-7) and the time zone tests should be kept even if other P1 work is cut. Each milestone ends with working, committed code.

| Milestone | Scope | Done when |
|---|---|---|
| M1: Foundation (days 1 to 2) | Project setup, Supabase schema and RLS, auth, trip CRUD, trip list | A user can sign up, create, edit, and delete trips, and cannot see other users' trips |
| M2: Items and itinerary (days 3 to 4) | Item forms for all types, day-by-day itinerary, item cards, detail card | All three item types can be created, edited, and deleted and appear in the correct day |
| M3: Interaction (days 5 to 6) | Drag and drop within and between days, flexible items, date range control | Reorder and move persist, date range filters the itinerary |
| M4: Map (days 7 to 8) | Map with numbered pins, day colors, connecting lines, flight arcs, two-way selection, fit to range | Selection syncs both ways, range changes update the map |
| M5: Budget and polish (days 9 to 10) | Budget summary and rules, booking status and payment badges, visual polish, loading and empty states | Budget numbers match the example in section 4.6 |
| M6: Mobile, demo, deploy (days 11 to 12) | Responsive layout, bottom sheet, demo mode and seed trip, deployment | Live URL works on a phone, `/demo` works with no login |
| Buffer (days 13 to 14) | Bug fixes, P1 items, README with screenshots | All P0 requirements pass their acceptance criteria |

### V1 is done when
- Every P0 requirement meets its acceptance criteria
- Unit tests pass for budget calculation, position math, time zone handling (including an overnight cross-time-zone flight), and map path building
- The core end-to-end flows pass
- The app is deployed and the demo trip works on a phone
- The README explains what the project is, shows screenshots, lists the stack, and has a "future work" section

## 9. Working Agreements for Agents

- Make small, focused commits and reference requirement IDs
- Keep pure logic (budget, ordering, time, map paths) in `lib/` as pure, tested functions, not inside components
- All data access goes through the repository interface, never directly from components
- Do not hardcode colors or spacing outside the Tailwind and shadcn/ui setup
- Handle loading, empty, and error states for every data view
- Never expose secrets, and never disable Row Level Security to make something work
- Prefer the simplest approach that meets the acceptance criteria, defer optimizations
- When something is unclear, state the assumption in the PR and continue

## 10. Future Versions (do not build now, but do not block)

**V2: Smart import.** Upload a PDF or screenshot, extract with an AI model using a structured schema, show a review screen, create the item, attach the document, detect duplicates (match on confirmation number, date, and route). Needs a `documents` table and Supabase Storage. V1 hooks: generic item model, `metadata`, confirmation number, cost, and time zone fields.

**V3: Smarter planning.** Travel time between stops and unrealistic-schedule warnings, free-time blocks, installable web app, read-only share page with private fields hidden.

**Later.** Collaboration and voting, expense splitting, recommendations, real routes, email import, during-trip mode, native app.

## 11. Assumptions and Open Questions

Assumptions made in this document:
- Single currency per trip with no conversion
- Items with status `idea` are excluded from budget totals
- Booking status (idea, planned, reserved) and payment status (unpaid, paid) are separate fields, and marking an item paid makes it reserved
- No partial payments in V1
- The free database may be paused. V1 does not work around this, the demo covers it
- Place search is optional and decided later
- Order within a day is manual (`position`), not forced by clock time

Open questions to settle during the build:
1. Which place search provider, if any, to add after P0 and P1 are done
2. Whether Google sign-in is worth including in V1 (currently P1)
3. Final name and domain (working title is Tripboard)
4. Which map tile provider to use, based on its free-tier terms at deploy time
