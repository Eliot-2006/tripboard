"use client";

import dynamic from "next/dynamic";

export const LazyMap = dynamic(() => import("./MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => <div className="h-[60vh] min-h-80 animate-pulse rounded-lg bg-muted" />,
});
