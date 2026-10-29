/**
 * Place search on the MapTiler Geocoding API (GEO-1). The mapping from its response to item fields lives here, away
 * from the UI, so the provider can be swapped. MapTiler returns no time zone, so none is read: the form keeps picking
 * the zone as before (ITEM-11).
 */

export type Place = { id: string; name: string; address: string; lat: string; lng: string };

export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 5;
/** MapTiler's required credit for geocoding results (also asked for with the map tiles). */
export const ATTRIBUTION = [
  { label: "© MapTiler", href: "https://www.maptiler.com/copyright/" },
  { label: "© OpenStreetMap contributors", href: "https://www.openstreetmap.org/copyright" },
] as const;

/**
 * The browser key for the geocoder: `NEXT_PUBLIC_MAPTILER_KEY` if set, else the `key` in a MapTiler tile URL. It is
 * public by design and restricted to this site's origin in the MapTiler account. Null hides the search.
 */
export function placeSearchKey(explicitKey: string | undefined, tileUrl: string | undefined): string | null {
  if (explicitKey?.trim()) return explicitKey.trim();
  if (!tileUrl) return null;
  try {
    const url = new URL(tileUrl.replace(/\{[a-z]+\}/g, "0"));
    return url.hostname.endsWith("maptiler.com") ? url.searchParams.get("key") || null : null;
  } catch {
    return null;
  }
}

export function geocodeUrl(query: string, key: string): string {
  const params = new URLSearchParams({ key, limit: String(MAX_RESULTS), autocomplete: "true" });
  return `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?${params}`;
}

// Six decimals is about 10 cm, and keeps the form's text fields short.
const coord = (n: number) => String(Math.round(n * 1e6) / 1e6);

/** Results of a geocoding response that have a usable point, as item fields. Anything else is skipped. */
export function parsePlaces(json: unknown): Place[] {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((f, i): Place[] => {
    const text = typeof f?.text === "string" ? f.text.trim() : "";
    const full = typeof f?.place_name === "string" ? f.place_name.trim() : "";
    const [lng, lat] = f?.center ?? f?.geometry?.coordinates ?? [];
    const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const name = text || full.split(", ")[0];
    if (!valid || !name) return [];
    // MapTiler's place_name starts with the name, then the area ("Eiffel Tower, Paris, France").
    const address = full.startsWith(`${name}, `) ? full.slice(name.length + 2) : full;
    return [{ id: typeof f.id === "string" ? f.id : `${i}-${lat},${lng}`, name, address, lat: coord(lat), lng: coord(lng) }];
  });
}
