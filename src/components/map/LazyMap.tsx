"use client";

import dynamic from "next/dynamic";

// Leaflet needs the browser, and the itinerary should not wait for it (MAP-8).
export const LazyMap = dynamic(() => import("./MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-[60vh] min-h-80 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground lg:h-full">
      Loading map…
    </div>
  ),
});
