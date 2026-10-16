"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { dayTextColor, ROUTE_COLOR } from "@/lib/map/colors";
import { arcPoints, buildPath, longitudeShift, mapStops, type LatLng, type Stop } from "@/lib/map/path";
import { formatDay } from "@/lib/time";
import type { Item } from "@/types";

// Tile provider from the environment (technical doc §8). OpenStreetMap's standard tiles are the default; check the
// provider's terms before production traffic and set NEXT_PUBLIC_MAP_TILE_URL to switch.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type Props = { items: Item[]; tripStart: string; selectedId: string | null; onSelect: (id: string) => void };

/** Numbered pins for the visible items, lines between consecutive stops and arcs for flights (MAP-1 to MAP-7). */
export function MapPanel({ items, tripStart, selectedId, onSelect }: Props) {
  const stops = useMemo(() => mapStops(items, tripStart), [items, tripStart]);
  const shift = useMemo(
    () => longitudeShift(stops.flatMap((s) => [s.at[1], ...(s.end ? [s.end[1]] : [])])),
    [stops],
  );
  const place = useMemo(() => (p: LatLng): LatLng => [p[0], shift(p[1])], [shift]);
  const segments = useMemo(
    () => buildPath(items).map((s) => ({ ...s, from: place(s.from), to: place(s.to) })),
    [items, place],
  );
  const legend = [...new Map(stops.map((s) => [s.item.day, s])).values()];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b pb-4">
        <p className="font-semibold font-stretch-condensed text-lg">
          Map · {stops.length} {stops.length === 1 ? "stop" : "stops"} in view
        </p>
        {legend.length > 0 && (
          <ul aria-label="Map legend: pin colors by day" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {legend.map((s) => (
              <li key={s.item.day} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                  style={{ backgroundColor: s.color, color: dayTextColor(s.dayIndex) }}
                >
                  {s.dayIndex + 1}
                </span>
                <span className="sr-only">{`Day ${s.dayIndex + 1}, `}</span>
                {formatDay(s.item.day)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* isolate: Leaflet's panes use z-indexes up to 1000, which must stay inside the map, under dialogs and sheets. */}
      <div className="relative isolate mt-4 h-[60vh] min-h-80 overflow-hidden rounded-md border lg:h-auto lg:flex-1">
        <MapContainer center={[20, 0]} zoom={2} className="size-full" scrollWheelZoom worldCopyJump={false}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          {segments.map((s, i) => (
            <Polyline
              key={i}
              positions={s.kind === "arc" ? arcPoints(s.from, s.to) : [s.from, s.to]}
              className="tripboard-route"
              pathOptions={{ color: ROUTE_COLOR, weight: 3, opacity: 0.75, dashArray: s.kind === "arc" ? "6 6" : undefined }}
              interactive={false}
            />
          ))}
          {stops.map((s) =>
            s.end ? (
              <CircleMarker
                key={`${s.item.id}-end`}
                center={place(s.end)}
                radius={5}
                className="tripboard-ring"
                pathOptions={{ color: s.color, fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}
                interactive={false}
              />
            ) : null,
          )}
          {stops.map((s) => (
            // Keyed by number too: Leaflet sets a marker's title only when it is created.
            <PinMarker
              key={`${s.item.id}-${s.number}`}
              stop={s}
              at={place(s.at)}
              selected={s.item.id === selectedId}
              onSelect={onSelect}
            />
          ))}
          <FitToStops points={stops.flatMap((s) => [place(s.at), ...(s.end ? [place(s.end)] : [])])} />
          <PanToSelected at={stops.find((s) => s.item.id === selectedId)?.at} place={place} />
        </MapContainer>
        {stops.length === 0 && (
          <p className="pointer-events-none absolute inset-x-14 top-4 z-[1000] rounded-md border bg-background p-3 text-center text-sm text-muted-foreground">
            No stops with a map location in this range. Add latitude and longitude to an item to see it here.
          </p>
        )}
      </div>
    </div>
  );
}

type PinProps = { stop: Stop; at: LatLng; selected: boolean; onSelect: (id: string) => void };

/** A pin that keyboard and screen reader users can reach: Leaflet makes it a button, named here after its item. */
function PinMarker({ stop, at, selected, onSelect }: PinProps) {
  const marker = useRef<L.Marker>(null);
  const label = `${stop.number}. ${stop.item.title}`;
  // The button's name would otherwise be just its number, and Leaflet sets the title only on creation. It also
  // replaces the element when the icon changes (on selection), so both are set again after every render.
  useEffect(() => {
    const el = marker.current?.getElement();
    el?.setAttribute("aria-label", label);
    if (el) el.title = label;
  });
  return (
    <Marker
      ref={marker}
      position={at}
      icon={pinIcon(stop, selected)}
      title={label}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect(stop.item.id),
        // Leaflet makes the pin a focusable button but forwards keys without clicking, so Enter and Space are handled here.
        keydown: (e: L.LeafletKeyboardEvent) => {
          if (e.originalEvent.key !== "Enter" && e.originalEvent.key !== " ") return;
          e.originalEvent.preventDefault();
          onSelect(stop.item.id);
        },
      }}
    />
  );
}

const icons = new Map<string, L.DivIcon>();

/**
 * A route bullet in the day's ink with the stop's number, so color is never the only signal (MAP-2). A selected pin
 * grows and fills with ink, like a selected station. Icons are cached: a new icon object makes Leaflet rebuild the
 * pin, which would drop keyboard focus.
 */
function pinIcon(stop: Stop, selected: boolean) {
  const size = selected ? 34 : 28;
  const key = `${stop.dayIndex}|${stop.number}|${selected}`;
  const cached = icons.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="tripboard-pin${selected ? " is-selected" : ""}" style="--pin:${stop.color};--pin-text:${dayTextColor(stop.dayIndex)}">${stop.number}</span>`,
  });
  icons.set(key, icon);
  return icon;
}

/**
 * Zooms to the visible stops whenever they change, e.g. when the date range changes (MAP-5). On phones the map
 * starts hidden behind the Itinerary toggle with no size, so it also refits once it is shown.
 */
function FitToStops({ points }: { points: LatLng[] }) {
  const map = useMap();
  // The set of places, not their order: reordering or moving an item between visible days keeps the view.
  const key = points.map((p) => p.join(",")).sort().join(";");
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const container = map.getContainer();
    // The map is a keyboard stop (arrow keys pan it), so it needs a name.
    container.setAttribute("aria-label", "Trip map. Pins are numbered in visit order.");
    let wasHidden = container.clientWidth === 0;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      const hidden = container.clientWidth === 0;
      if (wasHidden && !hidden) setShown((n) => n + 1);
      wasHidden = hidden;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    if (points.length === 0 || map.getContainer().clientWidth === 0) return;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [48, 48], maxZoom: 14 });
    // Refit when the set of points changes or the map is shown, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, shown]);
  return null;
}

/**
 * Selecting an item pans the map to its pin (MAP-4), zooming in to street level if the map is zoomed out further,
 * since at trip scale a city's pins sit on top of each other.
 */
function PanToSelected({ at, place }: { at: LatLng | undefined; place: (p: LatLng) => LatLng }) {
  const map = useMap();
  const [lat, lng] = at ? place(at) : [null, null];
  useEffect(() => {
    if (lat === null || lng === null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 12));
  }, [map, lat, lng]);
  return null;
}
