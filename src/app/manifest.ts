import type { MetadataRoute } from "next";

// Installable, not offline: there is deliberately no service worker (offline mode is out of scope in the PRD).
// Colors are the --background tokens in globals.css (the paper white; the dark value is set in the layout viewport).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tripboard",
    short_name: "Tripboard",
    description: "Plan a whole trip in one place: a day-by-day itinerary with a map.",
    start_url: "/trips",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
