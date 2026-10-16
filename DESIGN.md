---
name: Tripboard
description: A whole trip read as a transit line diagram, one colored line per day and a station per plan.
colors:
  ink: "#121417"
  paper: "#ffffff"
  signage-muted: "#b9bec4"
  muted-ink: "#5b616a"
  seam: "#d9dcdf"
  field-stroke: "#c9cdd1"
  platform-grey: "#eceeeb"
  wash: "#f3f4f2"
  signal-red: "#b42318"
  day-1-blue: "#0072B2"
  day-2-orange: "#E69F00"
  day-3-bluish-green: "#009E73"
  day-4-reddish-purple: "#CC79A7"
  day-5-vermillion: "#D55E00"
  day-6-sky-blue: "#56B4E9"
  day-7-olive: "#B8A100"
  day-8-grey: "#6B6B6B"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 75"
  station:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.5
    fontVariation: "'wdth' 75"
  figure:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  md: "4.8px"
  lg: "6px"
  xl: "8.4px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  gutter-lg: "32px"
  gutter-2xl: "48px"
  station: "12px"
  day: "32px"
components:
  signage-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "24px 32px 20px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#414345"
  button-on-signage:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-on-signage-hover:
    backgroundColor: "#dbdcdc"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.wash}"
  button-delete:
    textColor: "{colors.signal-red}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  badge-status:
    backgroundColor: "{colors.platform-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  badge-paid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  route-bullet:
    backgroundColor: "{colors.day-1-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "28px"
  detail-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Tripboard

## Overview

**Creative North Star: "The Line Diagram"**

Tripboard draws a trip the way Beck and Vignelli drew a metro: each day is a colored line, each plan a station on it, and the whole thing hangs off a black subway-sign band that carries the trip's name in white. The field is white paper with near-black ink. Hairline seams divide regions instead of shadows or tinted cards, and color is flat, never modulated. Every hue on the page is meaningful. The Okabe-Ito inks belong to days. Ink belongs to text, selection and flights. Red is kept for Delete.

The layout runs full-bleed. The itinerary reads as a timetable column next to a line with stations. On large screens a sticky route diagram fills the other half at full viewport height and takes the bigger share as the screen widens. Density is high but regular: every day block has the same structure and the same scale, so a nine-day trip scans like a printed line map. Hierarchy comes from scale contrast within one family, Archivo, set condensed for names and with tabular figures for times and money.

Dark mode (PRD UX-5) is the same map at night, not an inverted page: see Dark Mode below.

**Key Characteristics:**
- White field, near-black ink, 1px hairline seams, no gradients.
- One Okabe-Ito ink per day, shown as a round numbered route bullet with a 4px line running through its stations.
- A black signage band for the trip or brand name, with white text and a white primary button on it.
- Archivo throughout: semibold condensed for names, tabular figures for numbers.
- Selection is a filled ink station plus a 2px ink outline. Flights are heavier ink interchange rings.

## Colors

A colorless ink-on-paper field that hands all of its color to the day lines.

### Primary
- **Signage Ink** (ink): text, the primary button, the focus ring, the selected station and the signage band. Exposed as `--foreground`, `--primary`, `--ring` and `--signage`. A primary button is ink on paper. On the band the roles flip and the button is paper on ink.

### Tertiary
- **The Day Inks** (day-1 to day-8): the Okabe-Ito color-blind-safe set, with yellow darkened to olive (day-7) and black replaced by grey (day-8) so they read on white. They cycle by day index and are defined once, in `src/lib/map/colors.ts`, as hex because Leaflet can't read CSS tokens. Day 1 and day 8 bullets take paper numerals. The other six take ink numerals. Every pairing is at least 4.5:1.

### Neutral
- **Paper** (paper): page background, cards, popovers, field fills, and the text on the band.
- **Platform Grey** (platform-grey): the status badge fill and the empty track of the budget meter.
- **Concourse Wash** (wash): hover fill for rows and outline buttons, and the demo notice strip.
- **Timetable Grey** (muted-ink): secondary text such as times, places, labels and the "From / to" connectives.
- **Sign Silver** (signage-muted): secondary text on the band (dates, destinations).
- **Seam** (seam): every hairline divider and card border.
- **Field Stroke** (field-stroke): input and select borders, and the scrollbar thumb.
- **Signal Red** (signal-red): only for destructive actions and errors.

### Named Rules
**The Lines Own the Color Rule.** Chromatic color appears only as a day's ink: bullets, line segments, station rims and route rows. Interface chrome (buttons, badges, meter, selection) stays ink, grey and paper. The only other hue is the text-selection tint, 22% day-1 blue.

**The Never Alone Rule.** A day's ink always comes with its number in the bullet, and a station's state comes with a text badge. Color never carries meaning by itself.

## Dark Mode

Follows the system (`prefers-color-scheme: dark`), with no toggle. CSS only: `globals.css` overrides the `:root` tokens in one media block and sets `color-scheme` so native date pickers, selects and scrollbars match. No script, so there is no flash on load.

The metaphor is the line diagram at night: paper becomes a blue-black field, ink becomes off-white, hairlines stay hairlines.

| Token | Light | Dark |
|---|---|---|
| `--background` (paper) | #ffffff | #0d1117 |
| `--foreground`, `--primary`, `--ring` (ink) | #121417 | #e8eaed |
| `--popover` | #ffffff | #151b24 |
| `--muted`, `--accent`, `--secondary` | #f3f4f2, #f3f4f2, #eceeeb | #161c26, #1f2631, #1f2631 |
| `--muted-foreground` | #5b616a | #9aa3ae |
| `--border` (seam) | #d9dcdf | #2a323d |
| `--input` (field stroke) | #c9cdd1 | #3d4653 |
| `--destructive` | #b42318 | #f97066 |
| `--signage` (band) | #121417 | #1d2636 |
| `--signage-foreground`, `--signage-muted` | #ffffff, #b9bec4 | #f4f6f8, #aab3bf |

**The Band Stays a Band Rule.** In the dark the signage band is lifted one step above the field (#1d2636 on #0d1117) instead of sinking into it. Buttons on the band use `bg-signage-foreground text-signage`, never `bg-white`, so they flip with the theme.

**Day inks do not change.** The same eight hex values hold on the dark field. Against #0d1117 they are 3.5:1 or more as marks (day 1 3.65, day 8 3.55, the rest 4.9 to 8.4), and every numeral keeps its 4.5:1 on its own bullet. The numbers inside the bullets carry the meaning, as always.

**Map.** Raster tiles have no dark variant, so `.leaflet-tile-pane` alone gets `filter: invert(1) hue-rotate(180deg) brightness(.9) contrast(.9) saturate(.4)` in dark mode. Pins, route lines, legend and attribution sit outside that pane and are untouched. Route lines (`.tripboard-route`) and flight rings (`.tripboard-ring`) take their color from the tokens, because CSS on the SVG path overrides the hex Leaflet is given. Zoom controls and attribution use popover and background tokens.

Key contrasts (dark): ink on paper 15.7, muted on paper 7.4, muted on muted fill 6.7, muted on secondary 6.0, destructive on paper 6.8, band text 14.0, band muted 7.2.

## Typography

**Display Font:** Archivo (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Archivo, the same family

**Character:** One grotesque family used along its width axis. The condensed semibold cut (`font-stretch: condensed`, wdth 75) does the signage work for trip, day and station names. Normal width carries reading text. Tabular numerals line up times and money.

### Hierarchy
- **Display** (600 condensed, 36px / 48px / 72px at base / sm / lg, line-height 1.05, tracking -0.025em, balanced): the landing statement on the band.
- **Headline** (600 condensed, 36px to 48px, line-height 1): the trip name on the band and the page titles. The sample trip on the landing page steps down to 30px.
- **Title** (600 condensed, 20px): day headings next to their bullets. Detail-card titles use 18px.
- **Station** (600 condensed, 17px / 24px): item titles in the itinerary.
- **Figure** (600 condensed, 20px, tabular): budget figures.
- **Body** (400, 14px): places, times, detail rows and controls. Inputs use 16px on phones so iOS doesn't zoom.
- **Label** (400, 12px, muted-ink): the `dt` labels above budget figures and the badge text (500).

### Named Rules
**The Condensed Means Name Rule.** Condensed width is for proper names (trip, day, station, route) and money figures. Running text, controls and labels stay at normal width.

**The Tabular Clock Rule.** Every time, date range and amount uses `tabular-nums`, so columns of figures don't jitter.

## Layout

Full-bleed bands, not a centered column. Every horizontal band (signage, budget strip, itinerary, map) uses the same side gutter, which grows with the screen: 16px, 24px from sm, 32px from lg, 48px from 2xl. The trip band stacks the name block and "Add to trip" (bottom-aligned, wrapping), then a strip map of the days that scrolls sideways when it overflows (below sm its right end fades out to show there are more days). Under the band, the budget strip and the date range share one row over a bottom seam and wrap on narrow screens.

The workspace is a two-column grid from lg: 1:1 at lg, 5fr / 7fr at xl, 2fr / 3fr at 2xl. The map takes more of the width as the screen grows. The map column is sticky at full viewport height and scrolls internally, and a single hairline seam divides it from the itinerary. Below lg there is one column, and an Itinerary / Map pair of toggle buttons picks which section shows.

The itinerary rhythm is fixed: 32px between days, and stations are 12px vertical padding inside 44px-minimum rows. The station grid is a 28px marker column, an 88px timetable column (from sm, stacked above the title on phones), the title block, and the cost at the end. Line segments are 4px wide and centered at 14px in the marker column.

**Phone first screen.** Today's plan has to be reachable without scrolling past chrome. Below sm the band is compact (30px name, Edit trip and Add to trip share one full-width row), the budget figures sit in a three-column grid at 18px, the sample-data note is one line, and the "Whole trip" button is hidden while the whole trip is showing, so the date range is a single row of two selects. The first station lands around 540px down the 844px screen.

**States.** Loading is a skeleton in the page's own shape: a band of translucent bars on the signage, grey Platform bars (no spinners) for the budget strip, stations and trip cards, pulsing only when motion is allowed, with the text announced to screen readers. A trip that fails to load or is missing gets the signage band with its plain-language title, a sentence, and one primary action (Try again, or Back to your trips). The trip list's error and empty states share one dashed-border box with a condensed title.

**Long text.** Names wrap (`break-words`), destination lists clamp to two lines on trip cards, and station titles wrap in full. Times with a zone read "2:00 PM Tokyo time", never a GMT offset.

**The One Day Shape Rule.** Every day block has the same structure and scale whatever it contains: bullet, condensed date, line, stations. An empty day keeps its bullet and shows a dashed placeholder offering "Add something".

**The 44 Rule.** Every interactive target is at least 44px tall, including day bullets (44px hit area around a 32px disc), buttons, selects and station rows.

## Elevation & Depth

Flat. The page has no shadows, no gradients and no tinted card stacks. Depth comes from the black band against white paper, from hairline seams, and from the selection outline. The only lifted layer is a modal. Dialogs and the delete confirmation sit over a 30% black scrim with a soft drop shadow. On phones the dialog is a bottom sheet with rounded top corners.

### Shadow Vocabulary
- **Modal lift** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): dialog and alert-dialog popups over the scrim only.

### Named Rules
**The Seam Not Shadow Rule.** Separate regions with a 1px seam or a change of field (paper versus band), never a shadow. Shadows exist only on modals floating over the scrim.

## Shapes

Round where the transit language is round, slightly softened elsewhere. Route bullets, stations, interchange rings, badges and the budget meter are full circles or pills. Lines are 4px bars in the itinerary and 8px round-capped strokes in the diagram. Rectangular chrome has small radii: 4.8px for rows, cards, inputs and the empty-day placeholder, 6px for buttons, and 8.4px for dialogs. Stations are 14px rings with a 3px rim in the day's ink. Flights are 18px rings with an ink rim, the interchange. Selection fills the station with ink and scales it to 125%.

## Components

### Buttons
Quiet, ink-and-paper, and always 44px on the product surfaces.
- **Shape:** gently softened (6px).
- **Primary:** ink fill, paper text, 500 weight, 16px side padding. It also marks the pressed state of a toggle (Whole trip, Itinerary / Map) with `aria-pressed`.
- **On the band:** inverted to paper fill and ink text. Outline becomes a 30% white border, and ghost becomes paper text with a 10% white hover.
- **Outline:** paper with a seam border. Hover fills with the wash. Used for Edit, "Add something" and unpressed toggles.
- **Ghost / Delete:** no fill. Delete is ghost with Signal Red text and a 10% red hover, placed at the far end of its row away from Edit.
- **Focus:** 2px ink ring. Press nudges down 1px. Disabled is 50% opacity.

### Chips
- **Status badge:** a Platform Grey pill, 20px tall, 12px medium text (Idea / Planned / Reserved).
- **Paid badge:** an ink pill with paper text, added next to the status when an item is paid.

### Cards / Containers
- **Detail card:** opens in place under the selected station, indented past the line (32px) so its left edge lines up with the selection outline. Paper, seam border, 4.8px corners. Title row, a two-column `dt`/`dd` grid of muted labels and tabular values (16px padding), and an action row separated by seams.
- **Shadow Strategy:** none (see Elevation & Depth).

### Inputs / Fields
- **Style:** paper fill, Field Stroke border, 4.8px corners, 8px / 12px padding, 44px minimum height. Selects are native for reliability on phones and with screen readers.
- **Focus:** the border shifts to ink and adds a 2px ink ring.
- **Error / Disabled:** Signal Red border with a 20% red ring, or 50% opacity with a not-allowed cursor.

### Navigation
- **Day strip:** on the band, a row of 32px numbered bullets in each day's ink with a 2px band-colored ring, joined by 4px segments in the outgoing day's ink, like the strip map above a train door. Each bullet jumps to its day. Hover scales the bullet to 110%, and focus is a 2px white outline.

### Station Row (signature)
A full-width button for each itinerary item: a ring marker on the day line, then time, condensed title, an SVG icon with the place, badges, and the cost right-aligned in tabular semibold. Hover fills with the wash. When selected, the marker fills with ink and a 2px inset ink outline starts past the line. The line ends at the center of the last station.

### Map (signature)
Leaflet, in the map column, under a header that reads "Map · N stops in view" next to a legend of numbered day bullets. Pins are 28px route bullets in the day's ink with the stop number, a 2px paper ring and no shadow. A selected pin grows to 34px and fills with ink, like a selected station. Lines between stops are 3px ink at 75%, and flights are dashed arcs. A stop that travels (a flight, a train) also marks its end with a small paper ring in the day's ink. The map frame is a 6px-radius hairline box.

### Budget Meter
A 6px pill track in Platform Grey. Paid is a solid ink segment, and the remainder still to pay is 35% ink, both against the larger of the budget and the estimate. It repeats the figures above it and is hidden from assistive technology.

## Do's and Don'ts

### Do:
- **Do** give every day exactly one ink from the day palette, by index, and repeat it on the bullet, the line, the station rims and the route row.
- **Do** pair every bullet with its numeral (paper on day 1 and day 8, ink on the rest) and every state with a text badge.
- **Do** set names in Archivo semibold condensed and every time or amount in tabular figures.
- **Do** run bands full-bleed with the shared 16 / 24 / 32 / 48px gutter.
- **Do** keep interactive targets at 44px minimum.
- **Do** put the trip or brand name in white on the black signage band at the top of every surface.

### Don't:
- **Don't** use shadows or gradients on the page. Divide with 1px seams. The modal over its scrim is the only lifted layer.
- **Don't** use a day ink for interface chrome, and don't introduce a hue that isn't a day ink, ink, grey or Signal Red.
- **Don't** put the itinerary in rounded grey cards inside a centered fixed-width column.
- **Don't** let a day's structure or scale change with its content. Empty days keep their bullet and placeholder.
- **Don't** put Delete next to Edit. It goes at the far end of the row in Signal Red.
