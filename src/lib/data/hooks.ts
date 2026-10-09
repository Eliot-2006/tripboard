"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemPatch, NewItem } from "@/types";
import { useRepository } from "./provider";
import type { Repository } from "./repository";

const keys = {
  trip: (id: string) => ["trip", id] as const,
  items: (tripId: string) => ["items", tripId] as const,
};

export function useTrip(id: string) {
  const repo = useRepository();
  return useQuery({ queryKey: keys.trip(id), queryFn: () => repo.getTrip(id) });
}

export function useItems(tripId: string) {
  const repo = useRepository();
  return useQuery({ queryKey: keys.items(tripId), queryFn: () => repo.getItems(tripId) });
}

function useItemsMutation<V, R>(tripId: string, run: (repo: Repository, vars: V) => Promise<R>) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: V) => run(repo, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.items(tripId) }),
  });
}

export const useCreateItem = (tripId: string) =>
  useItemsMutation(tripId, (r, input: NewItem) => r.createItem(input));

export const useUpdateItem = (tripId: string) =>
  useItemsMutation(tripId, (r, v: { id: string; patch: ItemPatch }) => r.updateItem(v.id, v.patch));

export const useMoveItem = (tripId: string) =>
  useItemsMutation(tripId, (r, v: { id: string; day: string; position: number }) =>
    r.moveItem(v.id, v.day, v.position),
  );

export const useDeleteItem = (tripId: string) => useItemsMutation(tripId, (r, id: string) => r.deleteItem(id));
