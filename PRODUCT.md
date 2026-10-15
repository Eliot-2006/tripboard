# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: recruiters and reviewers who open the live demo (`/demo`) with no account and need to see, within the first minute, a polished, working product. Secondary: the author, planning real trips, and possible real users later, who use it on a laptop while planning and on a phone while traveling.

## Product Purpose

Tripboard puts an entire trip in one place, organized by day: flights, stays and activities as cards with times, places, costs and booking status, a date range control, a map companion, and a budget summary. It replaces a Google Doc itinerary plus a spreadsheet plus saved map pins. Success: a reviewer understands the product and the craft behind it from the demo alone, and a traveler can answer "what am I doing Tuesday, where is it, is it booked, what did it cost" at a glance.

## Positioning

The itinerary is the product; the map is a companion kept in sync with it. Booking status (idea, planned, reserved) is tracked separately from payment (unpaid, paid). Time zones are handled correctly: times are entered in local time, stored in UTC, and overnight flights show their arrival day (+1).

## Operating Context

- Landing page leads to the demo; sign-up, log-in and trips pages are placeholders until accounts exist ("Accounts aren't connected yet").
- The demo runs on an in-memory seeded trip ("Japan 2027", Apr 10 to 18, Tokyo and Kyoto) and resets on refresh.
- Desktop: itinerary and map side by side (UX-1). Mobile: single column with an Itinerary/Map toggle, 44 px tap targets (UX-2).
- The map is Leaflet: numbered pins colored by day, connecting lines and flight arcs, in sync with the itinerary.

## Capabilities and Constraints

- Next.js 16, React 19, Tailwind v4, base-ui primitives with shadcn-style components, lucide icons, Geist fonts.
- Add, edit and delete items with field-level validation; dialogs (bottom sheet on phones); budget summary over the whole trip.
- Day colors come from a fixed color-blind-safe palette of 8 (`src/lib/map/colors.ts`), shared by itinerary and map.
- Not yet built: deployment, Google sign-in (P1). Dark mode following system preference is a P1 requirement (UX-5), not yet implemented.

## Brand Commitments

- The name "Tripboard" is a working title and may change. Do not build the identity around the word itself.

## Evidence on Hand

- Product docs: `docs/tripboard-overview.md`, `docs/tripboard-prd.md`, `docs/tripboard-technical.md`.
- Demo seed: `supabase/seed/demo-trip.json`.
- No users, testimonials, metrics or press exist. Do not fabricate any.

## Product Principles

- The itinerary is the product, the map is the companion.
- Show the important details first, reveal the rest when an item is selected.
- Simple trips stay simple; advanced features stay out of the way.
- Phone friendly, because trip plans get used while traveling.
- Noticeably cleaner than a spreadsheet or a document.

## Accessibility & Inclusion

Keyboard-accessible controls, visible focus, semantic HTML, sufficient contrast (NFR-4). Never rely on color alone for status or day: badges carry text, pins carry numbers and day labels. Tap targets at least 44 px on mobile.
