---
version: 1
slug: "src-app-demo-page-tsx"
primary_target: "src/app/demo/page.tsx"
related_targets: ["src/app/page.tsx","src/components/BackendPending.tsx"]
---

# Surface brief: trip workspace (/demo) and the site around it

Scope: the demo trip workspace (Operate) is the primary surface; the landing page (Persuade) and the account placeholder pages share the world. Audience first: a recruiter opening /demo from a résumé on a laptop; second, a traveler on a phone. Task: read the trip by day, select an item for details, add, edit or delete items, narrow the date range. Constraints: e2e selectors (Day N · regions, Budget summary dl, Item details region, Itinerary/Map regions), 44 px tap targets, color never the only signal, the fixed Okabe-Ito day palette in src/lib/map/colors.ts.

User request: less generic, more appealing; fill the screen on a laptop (wider workspace, bigger map), collapse cleanly on a phone.

## Direction contract

THESIS: Each day is a colored transit line and every item a station on it; the itinerary reads like a metro line diagram set against a timetable column. Refuses the category default of rounded grey cards in a centered 1280 px column.

OWN-WORLD: White field, near-black ink (#121417), hairline seams, no shadows, no gradients. Day lines in the Okabe-Ito inks, each day with a round route bullet carrying its number. A black signage band (Vignelli subway-sign black) carries the trip name in white. Archivo: semibold condensed for station and trip names, tabular figures for times and money. Selection is a filled ink station plus an ink outline; interchange rings mark flights.

STORY: The visitor sees a whole trip as lines and stations, understands what happens each day, when, where, whether it is booked and what it costs, then opens a station, edits it, adds one, and watches the budget meter move.

FIRST VIEWPORT: Full-bleed. Top: the black band with the trip name large, dates and destinations, Add to trip at the right. Under it a fare strip: budget meter plus figures, then the date range. Below, edge to edge: itinerary on the left (time column, day line with stations, item rows), and a sticky route diagram panel filling the right half to full viewport height. Phone: single column, Itinerary/Map toggle.

FORM: Transit Line Diagram (Beck/Vignelli), my top-ranked grounded candidate (#1 of 7), chosen by the user as IMPECCABLE'S PICK over the roll; seed key 1cd70b31. Signature move: days as colored lines with stations, echoed as a schematic route diagram in the map panel until the real map ships.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Carried disciplines from the declined hand: hairline seams instead of shadows and Delete set apart from Edit (console); one structure and scale for every day block (botanical folio); flat, unmodulated color (zoo map); hierarchy from scale contrast in one family (type specimen).

Unresolved: dark mode (UX-5, P1) is not designed yet; the real map (M4) replaces the schematic panel.
