import { create } from "zustand";

export type Range = { start: string; end: string } | null;

type WorkspaceState = {
  selectedItemId: string | null;
  range: Range;
  select: (id: string | null) => void;
  setRange: (range: Range) => void;
  reset: () => void;
};

const initial = { selectedItemId: null, range: null as Range };

export const useWorkspace = create<WorkspaceState>()((set) => ({
  ...initial,
  select: (id) => set({ selectedItemId: id }),
  setRange: (range) => set({ range: range && range.start > range.end ? { start: range.end, end: range.start } : range }),
  reset: () => set(initial),
}));
