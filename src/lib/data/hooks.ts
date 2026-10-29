"use client";

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyMove, type Move } from "@/lib/ordering";
import type { Item, ItemPatch, NewItem, NewTrip } from "@/types";
import { useRepository } from "./provider";
import type { Repository } from "./repository";

const keys = {
  trips: ["trips"] as const,
  trip: (id: string) => ["trip", id] as const,
  items: (tripId: string) => ["items", tripId] as const,
};

export function useTrips() {
  const repo = useRepository();
  return useQuery({ queryKey: keys.trips, queryFn: () => repo.getTrips() });
}

export function useTrip(id: string) {
  const repo = useRepository();
  return useQuery({ queryKey: keys.trip(id), queryFn: () => repo.getTrip(id) });
}

export function useItems(tripId: string) {
  const repo = useRepository();
  return useQuery({ queryKey: keys.items(tripId), queryFn: () => repo.getItems(tripId) });
}

/** A share link's trip. Fetched once per page load: the page shows a snapshot, so a refetch would only reset the view. */
export function useSharedTrip(token: string) {
  const repo = useRepository();
  return useQuery({ queryKey: ["shared", token] as const, queryFn: () => repo.getSharedTrip(token), staleTime: Infinity });
}

/** A write through the repository that refetches the queries under `refresh` once it is saved. */
function useRepoMutation<V, R>(run: (repo: Repository, vars: V) => Promise<R>, ...refresh: (readonly string[])[]) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: V) => run(repo, vars),
    onSuccess: () => Promise.all(refresh.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

// A trip change refreshes the trip list and every open trip.
export const useCreateTrip = () => useRepoMutation((r, input: NewTrip) => r.createTrip(input), keys.trips, ["trip"]);

export const useUpdateTrip = () =>
  useRepoMutation((r, v: { id: string; patch: Partial<NewTrip> }) => r.updateTrip(v.id, v.patch), keys.trips, ["trip"]);

export const useDeleteTrip = () => useRepoMutation((r, id: string) => r.deleteTrip(id), keys.trips, ["trip"]);

// Turning sharing on, replacing the link or turning it off changes the trip's share_token.
export const useEnableSharing = () => useRepoMutation((r, tripId: string) => r.enableSharing(tripId), keys.trips, ["trip"]);

export const useRevokeSharing = () => useRepoMutation((r, tripId: string) => r.revokeSharing(tripId), keys.trips, ["trip"]);

export const useCreateItem = (tripId: string) =>
  useRepoMutation((r, input: NewItem) => r.createItem(input), keys.items(tripId));

export const useUpdateItem = (tripId: string) =>
  useRepoMutation((r, v: { id: string; patch: ItemPatch }) => r.updateItem(v.id, v.patch), keys.items(tripId));

/**
 * Drag and drop and "Move to day" (ITIN-5 to ITIN-7): the itinerary shows the move at once, then it is saved.
 * A failed save puts the items back where they were, and the list is refetched either way.
 */
export type MoveEvents = { onMoved?: (move: Move) => void; onFailed?: (move: Move) => void };

/** How many moves have started per trip, so a failing move can tell whether a later one has run since. */
const moveCount = new Map<string, number>();

export function moveItemOptions(repo: Repository, qc: QueryClient, tripId: string, events: MoveEvents = {}) {
  const key = keys.items(tripId);
  const mutationKey = ["move", tripId];
  // Moves can overlap (drag, then drag again before the first save ends). A failed move only rolls back to its
  // snapshot if no move started after it, since the snapshot predates that move; otherwise the refetch corrects it.
  const othersRunning = () => qc.isMutating({ mutationKey }) > 1;
  return {
    mutationKey,
    mutationFn: async (move: Move) => {
      for (const r of move.renumber) await repo.updateItem(r.id, { position: r.position });
      return repo.moveItem(move.id, move.day, move.position);
    },
    onMutate: async (move: Move) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Item[]>(key);
      if (previous) qc.setQueryData<Item[]>(key, applyMove(previous, move));
      const order = (moveCount.get(tripId) ?? 0) + 1;
      moveCount.set(tripId, order);
      return { previous, order };
    },
    // Reported from here, not from mutate() callbacks, which TanStack only runs for the latest move.
    onSuccess: (_saved: Item, move: Move) => events.onMoved?.(move),
    onError: (_error: unknown, move: Move, context: { previous?: Item[]; order: number } | undefined) => {
      const latest = context?.order === moveCount.get(tripId);
      if (context?.previous && latest && !othersRunning()) qc.setQueryData(key, context.previous);
      events.onFailed?.(move);
    },
    onSettled: () => (othersRunning() ? undefined : qc.invalidateQueries({ queryKey: key })),
  };
}

export function useMoveItem(tripId: string, events: MoveEvents) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation(moveItemOptions(repo, qc, tripId, events));
}

export const useDeleteItem = (tripId: string) => useRepoMutation((r, id: string) => r.deleteItem(id), keys.items(tripId));
