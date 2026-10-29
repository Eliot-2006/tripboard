import { describe, expect, it } from "vitest";
import { geocodeUrl, parsePlaces, placeSearchKey } from "./index";

// Shaped like the Geocoding API's GeoJSON response (docs.maptiler.com/cloud/api/geocoding), trimmed.
const response = {
  type: "FeatureCollection",
  query: ["senso-ji"],
  features: [
    {
      id: "poi.123456",
      type: "Feature",
      place_type: ["poi"],
      relevance: 0.99,
      properties: { ref: "osm:node:123456", country_code: "jp", kind: "temple", categories: ["temple"] },
      text: "Sensō-ji",
      place_name: "Sensō-ji, Asakusa, Taitō, Tokyo, Japan",
      center: [139.796658, 35.714765],
      geometry: { type: "Point", coordinates: [139.796658, 35.714765] },
      bbox: [139.79, 35.71, 139.8, 35.72],
      context: [{ id: "locality.1", text: "Asakusa" }, { id: "country.2", text: "Japan", country_code: "jp" }],
    },
    {
      id: "address.789",
      type: "Feature",
      place_type: ["address"],
      relevance: 0.7,
      properties: {},
      text: "Rue de Rivoli",
      address: "99",
      place_name: "99 Rue de Rivoli, Paris, France",
      center: [2.3412, 48.8606],
      geometry: { type: "Point", coordinates: [2.3412, 48.8606] },
    },
  ],
  attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>',
};

describe("parsePlaces", () => {
  it("maps name, address and coordinates (longitude first in GeoJSON)", () => {
    expect(parsePlaces(response)[0]).toEqual({
      id: "poi.123456",
      name: "Sensō-ji",
      address: "Asakusa, Taitō, Tokyo, Japan",
      lat: "35.714765",
      lng: "139.796658",
    });
  });

  it("keeps the whole place name as the address when it does not start with the name", () => {
    const [, street] = parsePlaces(response);
    expect(street).toMatchObject({ name: "Rue de Rivoli", address: "99 Rue de Rivoli, Paris, France" });
  });

  it("rounds to six decimals and falls back to geometry when there is no center", () => {
    const f = { id: "a", text: "X", place_name: "X", geometry: { coordinates: [-118.123456789, 34.0000004] } };
    expect(parsePlaces({ features: [f] })[0]).toMatchObject({ lat: "34", lng: "-118.123457" });
  });

  it("skips results without a usable point or name, and tolerates other shapes", () => {
    const bad = [
      { text: "No point", place_name: "No point" },
      { text: "Off the map", center: [200, 95] },
      { text: "NaN", center: ["a", "b"] },
      { center: [1, 2] },
      null,
    ];
    expect(parsePlaces({ features: bad })).toEqual([]);
    expect(parsePlaces({})).toEqual([]);
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({ features: "nope" })).toEqual([]);
  });
});

describe("placeSearchKey", () => {
  const tiles = "https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=abc123";
  it("prefers the explicit key", () => expect(placeSearchKey(" k1 ", tiles)).toBe("k1"));
  it("reads the key from a MapTiler tile URL", () => expect(placeSearchKey(undefined, tiles)).toBe("abc123"));
  it("is null without a key, for other providers, and for bad URLs", () => {
    expect(placeSearchKey(undefined, undefined)).toBeNull();
    expect(placeSearchKey("", "")).toBeNull();
    expect(placeSearchKey(undefined, "https://tile.openstreetmap.org/{z}/{x}/{y}.png")).toBeNull();
    expect(placeSearchKey(undefined, "https://other.example/{z}/{x}/{y}.png?key=zzz")).toBeNull();
    expect(placeSearchKey(undefined, "https://api.maptiler.com/maps/x/{z}/{x}/{y}.png")).toBeNull();
    expect(placeSearchKey(undefined, "not a url")).toBeNull();
  });
});

describe("geocodeUrl", () => {
  it("encodes the query and asks for autocomplete results", () => {
    const url = new URL(geocodeUrl(" Café de Flore/Paris ", "k"));
    expect(url.pathname).toBe("/geocoding/Caf%C3%A9%20de%20Flore%2FParis.json");
    expect(url.searchParams.get("key")).toBe("k");
    expect(url.searchParams.get("autocomplete")).toBe("true");
    expect(url.searchParams.get("limit")).toBe("5");
  });
});
