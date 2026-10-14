import { Fragment } from "react";
import { dayColor, dayTextColor } from "@/lib/map/colors";
import { dayDiff, formatDay } from "@/lib/time";
import type { Item } from "@/types";

type Props = { items: Item[]; days: string[]; tripStart: string; selectedId: string | null };

// Drawing units: the SVG scales to the panel's width, so lines, stations and labels grow with the screen.
const W = 1000;
const ROW = 104;
const EDGE = 64; // Where a row turns: its transfer ring sits here, and the curve to the next row bends around it.
const TOP = 40;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text);

/**
 * Stand-in for the map (M4): the stops in view as one route. Each day is a row in its own color, running
 * alternately left and right, and joined to the next day at a transfer ring. It is not geography, so it says so,
 * and it is hidden from screen readers because the itinerary already lists every stop.
 */
export function MapPanel({ items, days, tripStart, selectedId }: Props) {
  const pins = items.filter((i) => i.start_lat !== null && i.start_lng !== null).length;
  const rows = days.map((day, r) => {
    const stops = items.filter((i) => i.day === day);
    const ltr = r % 2 === 0;
    const [from, to] = ltr ? [EDGE, W - EDGE] : [W - EDGE, EDGE];
    const y = TOP + r * ROW;
    const step = (to - from) / (stops.length + 1);
    return { day, dayIndex: dayDiff(tripStart, day), stops, ltr, from, to, y, step };
  });
  const height = TOP + Math.max(rows.length - 1, 0) * ROW + 56;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-4">
        <p className="font-semibold font-stretch-condensed text-lg">
          Route · {pins} {pins === 1 ? "stop" : "stops"} in view
        </p>
        <p className="text-sm text-muted-foreground">Schematic until the map arrives</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        <svg aria-hidden viewBox={`0 0 ${W} ${height}`} className="w-full font-sans">
          {rows.map(({ day, dayIndex, stops, ltr, from, to, y, step }, r) => {
            const color = dayColor(dayIndex);
            const next = rows[r + 1];
            const empty = stops.length === 0;
            // Half-turn around the row's far edge, down to where the next day starts.
            const bend = ltr ? 1 : 0;
            return (
              <Fragment key={day}>
                <path
                  d={`M ${from} ${y} H ${to}${next ? ` A ${ROW / 2} ${ROW / 2} 0 0 ${bend} ${to} ${next.y}` : ""}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={empty ? "2 16" : undefined}
                />
                {/* Chevrons between stops show which way the row runs, since every other row reads right to left. */}
                {!empty &&
                  Array.from({ length: stops.length + 1 }, (_, k) => (
                    <path
                      key={k}
                      d="M -4 -6 L 3 0 L -4 6"
                      transform={`translate(${from + step * (k + 0.5)} ${y}) scale(${ltr ? 1 : -1} 1)`}
                      fill="none"
                      className="stroke-background"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                {empty && (
                  <text x={W / 2} y={y + 30} textAnchor="middle" fontSize={15} className="fill-muted-foreground">
                    No stops planned
                  </text>
                )}
                {stops.map((s, k) => {
                  const x = from + step * (k + 1);
                  const selected = s.id === selectedId;
                  const flight = s.type === "flight";
                  return (
                    <g key={s.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r={selected ? 13 : flight ? 12 : 10}
                        className={selected ? "fill-foreground stroke-foreground" : "fill-background"}
                        stroke={selected || flight ? undefined : color}
                        strokeWidth={flight ? 6 : 5}
                        style={flight && !selected ? { stroke: "var(--foreground)" } : undefined}
                      />
                      <text
                        x={x}
                        y={y + 36}
                        textAnchor="middle"
                        fontSize={15}
                        fontWeight={selected ? 700 : 500}
                        className={selected ? "fill-foreground" : "fill-muted-foreground"}
                      >
                        {clip(s.title, Math.floor(Math.abs(step) / 8.5))}
                      </text>
                    </g>
                  );
                })}
                {/* Transfer ring: where the route enters this day. */}
                <circle cx={from} cy={y} r={20} fill={color} className="stroke-background" strokeWidth={5} />
                <text x={from} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={dayTextColor(dayIndex)}>
                  {dayIndex + 1}
                </text>
                <text
                  x={from + (ltr ? 32 : -32)}
                  y={y - 18}
                  textAnchor={ltr ? "start" : "end"}
                  fontSize={16}
                  fontWeight={600}
                  className="fill-foreground"
                >
                  {formatDay(day)}
                </text>
              </Fragment>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
