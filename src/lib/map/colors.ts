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
