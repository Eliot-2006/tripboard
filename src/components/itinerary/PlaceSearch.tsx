"use client";

import { Combobox } from "@base-ui/react/combobox";
import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { ATTRIBUTION, geocodeUrl, MIN_QUERY_LENGTH, parsePlaces, placeSearchKey, type Place } from "@/lib/places";

// Read as literals so Next inlines them into the browser bundle. The key is public; MapTiler restricts it by origin.
const KEY = placeSearchKey(process.env.NEXT_PUBLIC_MAPTILER_KEY, process.env.NEXT_PUBLIC_MAP_TILE_URL);
const DEBOUNCE_MS = 300;

/** Whether the form offers place search. Without a MapTiler key it is hidden and places are typed as before. */
export const placeSearchEnabled = KEY !== null;

type State = { status: "idle" | "loading" | "error" } | { status: "done"; places: Place[] };

type Props = { onPick: (place: Place) => void };

/** Search box that fills a place's name, address and coordinates (GEO-1). Typing them by hand stays possible. */
export function PlaceSearch({ onPick }: Props) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const ready = query.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!ready || !KEY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ status: "loading" });
      try {
        const res = await fetch(geocodeUrl(query, KEY), { signal: controller.signal });
        if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
        setState({ status: "done", places: parsePlaces(await res.json()) });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }, DEBOUNCE_MS);
    // A newer query (or closing the form) cancels this one, so a slow answer never replaces a fresher one.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, ready]);

  const places = ready && state.status === "done" ? state.places : [];
  const status = !ready ? "idle" : state.status === "done" ? (places.length ? "results" : "empty") : state.status;
  const message = {
    idle: "",
    loading: "Searching…",
    error: "Search isn't available right now. You can type the place below instead.",
    empty: "No places found. Try another spelling, or type the place below.",
    results: `${places.length} ${places.length === 1 ? "place" : "places"} found`,
  }[status];

  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <Label htmlFor={`${uid}-search`}>Search for a place</Label>
      <Combobox.Root<Place>
        items={places}
        filter={null}
        value={null}
        inputValue={query}
        open={open && ready}
        itemToStringLabel={(p) => p.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
        onOpenChange={setOpen}
        onInputValueChange={(v, details) => {
          // Picking a result would put its name in the box. The name goes to the form fields instead.
          if (details.reason === "item-press") return;
          if (v.trim().length < MIN_QUERY_LENGTH) setState({ status: "idle" });
          setQuery(v);
        }}
        onValueChange={(place) => {
          if (!place) return;
          onPick(place);
          setQuery("");
          setState({ status: "idle" });
        }}
      >
        <Combobox.Input
          id={`${uid}-search`}
          placeholder="For example Senso-ji Temple"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${uid}-search-hint`}
          className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />
        <p id={`${uid}-search-hint`} className="text-xs text-muted-foreground">
          Pick a result to fill in the fields below. Type at least {MIN_QUERY_LENGTH} letters.
        </p>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-[60] w-(--anchor-width)">
            <Combobox.Popup className="max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
              <Combobox.Status
                className={
                  places.length
                    ? "sr-only"
                    : `px-3 py-3 text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`
                }
              >
                {message}
              </Combobox.Status>
              <Combobox.List>
                {(place: Place) => (
                  <Combobox.Item
                    key={place.id}
                    value={place}
                    className="flex min-h-11 cursor-default flex-col justify-center px-3 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <span className="font-medium">{place.name}</span>
                    {place.address && <span className="text-xs text-muted-foreground">{place.address}</span>}
                  </Combobox.Item>
                )}
              </Combobox.List>
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                {ATTRIBUTION.map((a, i) => (
                  <span key={a.href}>
                    {i > 0 && " "}
                    <a href={a.href} target="_blank" rel="noreferrer" className="underline">
                      {a.label}
                    </a>
                  </span>
                ))}
              </p>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
