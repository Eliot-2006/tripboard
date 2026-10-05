import type { Item } from "@/types";

export function MapPanel({ items }: { items: Item[] }) {
  const pins = items.filter((i) => i.start_lat !== null && i.start_lng !== null).length;
  return (
    <div className="flex h-[60vh] min-h-80 items-center justify-center rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground lg:sticky lg:top-4">
      Map coming soon. {pins} {pins === 1 ? "stop" : "stops"} in view.
    </div>
  );
}
