// Hex values because Leaflet cannot read Tailwind tokens. Color-blind-safe palette.
// Never the only signal: pins also carry numbers and day labels.
export const DAY_COLORS = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#CC79A7",
  "#D55E00",
  "#56B4E9",
  "#B8A100",
  "#6B6B6B",
] as const;

export const dayColor = (dayIndex: number): string => DAY_COLORS[dayIndex % DAY_COLORS.length];

// Numerals on a day's route bullet: white on the two dark inks, ink on the rest (each pair is at least 4.5:1).
const ON_DAY = ["#FFFFFF", "#121417", "#121417", "#121417", "#121417", "#121417", "#121417", "#FFFFFF"] as const;

export const dayTextColor = (dayIndex: number): string => ON_DAY[dayIndex % ON_DAY.length];

/** Route lines between stops: the ink (--foreground), as hex for the same reason. */
export const ROUTE_COLOR = "#121417";
