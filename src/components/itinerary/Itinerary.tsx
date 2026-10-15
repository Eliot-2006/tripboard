"use client";

import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  type Active,
  type DragMoveEvent,
  type Over,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BedDouble, GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { dayColor, dayTextColor } from "@/lib/map/colors";
import { dayDiff, formatDay, formatItemTime } from "@/lib/time";
import { cn } from "cn";
import type { Item } from "@/types";
import { DetailCard } from "./DetailCard";
import { ItemCard } from "./ItemCard";

type Props = {
  tripStart: string;
  /** Every day of the trip, for "Move to day". */
  tripDays: string[];
  /** The days in the visible range. */
  days: string[];
  items: Item[];
  /** Stays covering each day without starting on it (ITIN-8). */
  staying: Record<string, Item[]>;
  /** Show the selected item's details under it. Phones show them in a bottom sheet instead (UX-2). */
  inlineDetails: boolean;
  currency: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (day: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  /** Drag and drop: put the item on `day` at `index` among that day's other items (ITIN-5, ITIN-6). */
  onMove: (item: Item, day: string, index: number) => void;
  onMoveToDay: (item: Item, day: string) => void;
};

/** What a drop target is: a day (when empty), the end of a day, or an item (by its id) on a day. */
type DropData = { day: string; end?: boolean };

/** One segment of a day's line. It runs through the 1.75rem marker column (center at 14px, 4px wide). */
const segment = "pointer-events-none absolute left-3 z-10 w-1 bg-(--line)";

/**
 * Drop where the pointer is: on an item if it is over one, else on the day under it (empty days included).
 * Keyboard drags have no pointer, so they fall back to the nearest target.
 */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCorners(args);
  const onItems = hits.filter((h) => !String(h.id).startsWith("day:")); // items and end-of-day slots
  return onItems.length > 0 ? onItems : hits;
};

const instructions =
  "To move an item, focus its handle and press space or enter. Use the arrow keys to move it within or between days, " +
  "then press space or enter to drop it, or escape to cancel.";

export function Itinerary(props: Props) {
  const { tripStart, tripDays, days, items, staying, inlineDetails, currency, selectedId } = props;
  const { onSelect, onAdd, onEdit, onDelete, onMove, onMoveToDay } = props;
  const selectedCard = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<Item | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  // Where a drop would land, drawn as a line before or after an item.
  const [marker, setMarker] = useState<{ id: string; after: boolean } | null>(null);

  // After a move the item's row is rebuilt (in another day's list), which drops focus. Put it back on the handle
  // for drags, or on the card for "Move to day", once the moved item is on screen.
  const refocus = useRef<{ id: string; on: "handle" | "card" } | null>(null);
  useEffect(() => {
    const target = refocus.current;
    const row = target && root.current?.querySelector<HTMLElement>(`[data-item-row="${CSS.escape(target.id)}"]`);
    if (!target || !row) return;
    refocus.current = null;
    row.querySelector<HTMLElement>(target.on === "handle" ? "[data-drag-handle]" : "[aria-expanded]")?.focus();
    row.scrollIntoView({ block: "nearest" });
  }, [items]);

  // Bring a newly selected item and its details on screen, e.g. right after it is added or picked on the map.
  useEffect(() => {
    selectedCard.current?.closest("li")?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);
  // Closing unmounts the focused Close button, so hand focus back to the card that opened it.
  const close = () => {
    selectedCard.current?.focus();
    onSelect(null);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // On touch a drag starts after a short press, so a quick swipe across a handle still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = (id: UniqueIdentifier) => items.find((i) => i.id === id);
  const dropOf = (over: { data: { current?: unknown } } | null) => over?.data.current as DropData | undefined;
  const dayOf = (over: { data: { current?: unknown } } | null) => dropOf(over)?.day;
  const dayItems = (day: string) => items.filter((i) => i.day === day);
  const dayName = (day: string) => `day ${dayDiff(tripStart, day) + 1}, ${formatDay(day)}`;

  /**
   * Where the dragged item would land over `over`: its day, its index among that day's other items, and the item
   * to draw the landing line against. Null when it would not move. Used for the line, the announcements and the drop.
   */
  const landing = (active: Active, over: Over | null) => {
    const item = byId(active.id);
    const day = dayOf(over);
    if (!item || !over || !day) return null;
    const target = dayItems(day);
    const overIndex = target.findIndex((i) => i.id === over.id);
    if (item.day === day) {
      // Within a day the list reorders as the item moves: it ends up where the sortable put it, or last on the
      // end of the day. Moving down it lands after the item it is over, moving up before it.
      const from = target.findIndex((i) => i.id === item.id);
      const to = overIndex === -1 ? target.length - 1 : overIndex;
      if (from === to) return null;
      const index = arrayMove(target, from, to).findIndex((i) => i.id === item.id);
      return { item, day, index, marker: overIndex === -1 ? null : { id: String(over.id), after: from < to } };
    }
    if (overIndex === -1) return { item, day, index: target.length, marker: null };
    // On another day it goes before or after the item it is over, by which half the dragged card is on.
    const dragged = active.rect.current.translated;
    const after = dragged !== null && dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
    return { item, day, index: overIndex + (after ? 1 : 0), marker: { id: String(over.id), after } };
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${byId(active.id)?.title}.`,
    // Say exactly where it would land, so screen reader users can place it without seeing the line.
    onDragOver: ({ active, over }) => {
      const title = byId(active.id)?.title;
      const day = dayOf(over);
      if (!over || !day) return `${title} is not over a day.`;
      const land = landing(active, over);
      if (!land) return `${title} is in its current place.`;
      if (land.marker) {
        const other = byId(land.marker.id)?.title;
        return `${title} will go ${land.marker.after ? "after" : "before"} ${other} on ${dayName(day)}.`;
      }
      return dropOf(over)?.end ? `${title} is at the end of ${dayName(day)}.` : `${title} is over ${dayName(day)}.`;
    },
    onDragEnd: ({ active, over }) => {
      const land = landing(active, over);
      return land ? `Dropped ${land.item.title} on ${dayName(land.day)}.` : `${byId(active.id)?.title} was not moved.`;
    },
    onDragCancel: ({ active }) => `Moving ${byId(active.id)?.title} was cancelled.`,
  };

  const reset = () => {
    setDragging(null);
    setOverDay(null);
    setMarker(null);
  };
  const start = ({ active }: DragStartEvent) => setDragging(byId(active.id) ?? null);
  // The line is updated here too: dnd-kit fires the move event before it updates the target.
  const over = ({ active, over }: DragOverEvent) => {
    setOverDay(dayOf(over) ?? null);
    setMarker(landing(active, over)?.marker ?? null);
  };
  const moveAlong = ({ active, over }: DragMoveEvent) => {
    const next = landing(active, over)?.marker ?? null;
    setMarker((current) => (current?.id === next?.id && current?.after === next?.after ? current : next));
  };
  const end = ({ active, over }: DragEndEvent) => {
    reset();
    const land = landing(active, over);
    if (!land) return;
    refocus.current = { id: land.item.id, on: "handle" };
    onMove(land.item, land.day, land.index);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      accessibility={{ announcements, screenReaderInstructions: { draggable: instructions } }}
      onDragStart={start}
      onDragOver={over}
      onDragMove={moveAlong}
      onDragEnd={end}
      onDragCancel={reset}
    >
      <div ref={root} className="flex flex-col gap-8">
        {days.map((day) => {
          const dayIndex = dayDiff(tripStart, day);
          const list = dayItems(day);
          return (
            <DaySection
              key={day}
              day={day}
              line={dayColor(dayIndex)}
              empty={list.length === 0}
              highlighted={dragging !== null && overDay === day && dragging.day !== day}
            >
              {/* Focusable from script only: focus lands here after an item on this day is deleted. */}
              <h2 id={`day-${day}`} tabIndex={-1} className="relative flex items-center gap-3 pb-1 outline-offset-4">
                <span
                  aria-hidden
                  className="relative z-20 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
                  style={{ backgroundColor: dayColor(dayIndex), color: dayTextColor(dayIndex) }}
                >
                  {dayIndex + 1}
                </span>
                <span className="sr-only">{`Day ${dayIndex + 1} · `}</span>
                <span className="text-xl font-semibold tracking-tight font-stretch-condensed">{formatDay(day)}</span>
                {list.length > 0 && <span aria-hidden className={`${segment} top-1/2 bottom-0`} />}
              </h2>
              {staying[day]?.map((stay) => (
                <p key={stay.id} className="relative flex items-center gap-1.5 py-1.5 pl-10 text-sm text-muted-foreground">
                  {list.length > 0 && <span aria-hidden className={`${segment} inset-y-0`} />}
                  <BedDouble className="size-3.5 shrink-0" aria-hidden />
                  Staying at {stay.title}
                </p>
              ))}
              {list.length === 0 ? (
                <div className="mt-2 ml-8 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  <span>{dragging ? "Drop here to move it to this day." : "Nothing planned yet."}</span>
                  <Button variant="outline" className="min-h-11 px-4" onClick={() => onAdd(day)}>
                    Add something
                  </Button>
                </div>
              ) : (
                <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col">
                    {list.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        day={day}
                        marker={marker?.id === item.id ? (marker.after ? "after" : "before") : null}
                      >
                        <ItemCard
                          ref={item.id === selectedId ? selectedCard : undefined}
                          item={item}
                          currency={currency}
                          selected={item.id === selectedId}
                          onSelect={() => onSelect(item.id === selectedId ? null : item.id)}
                          detailsId={`details-${item.id}`}
                        />
                        {/* Expanded card under the selection, so it opens where the user clicked (ITIN-3). */}
                        {inlineDetails && item.id === selectedId && (
                          <DetailCard
                            id={`details-${item.id}`}
                            item={item}
                            currency={currency}
                            days={tripDays}
                            tripStart={tripStart}
                            onClose={close}
                            onEdit={() => onEdit(item)}
                            onDelete={() => onDelete(item)}
                            onMoveToDay={(d) => {
                              refocus.current = { id: item.id, on: "card" };
                              onMoveToDay(item, d);
                            }}
                          />
                        )}
                      </SortableRow>
                    ))}
                  </ul>
                  <EndSlot day={day} dragging={dragging !== null} />
                </SortableContext>
              )}
            </DaySection>
          );
        })}
      </div>
      <DragOverlay>
        {dragging && (
          <div className="flex items-center gap-3 rounded-md border bg-background px-3 py-3 shadow-lg">
            <span className="text-sm text-muted-foreground tabular-nums">{formatItemTime(dragging)}</span>
            <span className="font-semibold font-stretch-condensed">{dragging.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

type DaySectionProps = { day: string; line: string; empty: boolean; highlighted: boolean; children: ReactNode };

/**
 * An empty day is a drop target itself. A day with items is targeted through its items, so a keyboard drag moves
 * between items rather than landing on the day around them.
 */
function DaySection({ day, line, empty, highlighted, children }: DaySectionProps) {
  const { setNodeRef } = useDroppable({ id: `day:${day}`, data: { day } satisfies DropData, disabled: !empty });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`day-${day}`}
      className={cn("relative scroll-mt-4 rounded-md", highlighted && "bg-muted ring-2 ring-foreground ring-offset-4")}
      style={{ "--line": line } as CSSProperties}
    >
      {children}
    </section>
  );
}

/** The space after a day's last item, so a drag (by pointer or keyboard) can put an item last on that day. */
function EndSlot({ day, dragging }: { day: string; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `end:${day}`, data: { day, end: true } satisfies DropData });
  return (
    <div
      ref={setNodeRef}
      aria-hidden
      className={cn(
        // Laid over the gap below the day, so it takes no space and nothing moves when a drag starts, which would
        // put the drop targets somewhere other than where they look. It stays clear of the next day's heading.
        "absolute right-0 -bottom-7 left-8 z-10 flex h-6 items-center justify-center rounded-md text-xs text-muted-foreground",
        dragging && "border border-dashed bg-background",
        isOver && "border-foreground bg-muted",
      )}
    >
      {dragging && "End of day"}
    </div>
  );
}

/** A station: the card with a drag handle at its end, its details below, and the day's line through both. */
type RowProps = { item: Item; day: string; marker: "before" | "after" | null; children: [ReactNode, ReactNode] };

function SortableRow({ item, day, marker, children }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { day } satisfies DropData,
  });
  const [card, details] = children;
  return (
    <li
      ref={setNodeRef}
      data-item-row={item.id}
      style={{ transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined, transition }}
      className={cn("group relative flex flex-col", isDragging && "opacity-40")}
    >
      {/* The last station ends the line at its own center. */}
      <span aria-hidden className={`${segment} top-0 bottom-0 group-last:bottom-auto group-last:h-6`} />
      {marker && (
        <span
          aria-hidden
          className={cn("absolute right-0 left-8 z-30 h-1 rounded-full bg-foreground", marker === "before" ? "-top-0.5" : "-bottom-0.5")}
        />
      )}
      <div className="flex items-stretch">
        <div className="min-w-0 flex-1">{card}</div>
        <button
          ref={setActivatorNodeRef}
          type="button"
          data-drag-handle
          {...attributes}
          {...listeners}
          aria-label={`Move ${item.title}`}
          className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      </div>
      {details}
    </li>
  );
}
