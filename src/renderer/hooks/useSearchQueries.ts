// src/renderer/hooks/useSearchQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for search management CRUD.
// Data flows through services → @tauri-apps/plugin-sql → SQLite.
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SearchDefinition, SearchInput, SearchUpdate } from "../../shared/types";
import { getDb } from "../../services/database";
import {
  listSearches,
  getSearch,
  createSearch,
  updateSearch,
  deleteSearch,
  checkDuplicate,
} from "../../services/search-service";

const SEARCH_LIST_KEY = ["searches"] as const;

function searchKey(id: string) {
  return ["searches", id] as const;
}

export function useSearchList() {
  return useQuery<SearchDefinition[]>({
    queryKey: SEARCH_LIST_KEY,
    queryFn: async () => {
      const db = await getDb();
      return listSearches(db);
    },
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSearch(id: string | null) {
  return useQuery<SearchDefinition | null>({
    queryKey: searchKey(id ?? ""),
    queryFn: async () => {
      if (!id) return null;
      const db = await getDb();
      return (await getSearch(db, id)) ?? null;
    },
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateSearch() {
  const queryClient = useQueryClient();

  return useMutation<SearchDefinition, Error, SearchInput>({
    mutationFn: async (input) => {
      const db = await getDb();
      return createSearch(db, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SEARCH_LIST_KEY });
    },
  });
}

export function useUpdateSearch() {
  const queryClient = useQueryClient();

  return useMutation<SearchDefinition, Error, { id: string; input: SearchUpdate }>({
    mutationFn: async ({ id, input }) => {
      const db = await getDb();
      return (await updateSearch(db, id, input))!;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: SEARCH_LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: searchKey(data.id) });
    },
  });
}

export function useDeleteSearch() {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: async (id) => {
      const db = await getDb();
      return { deleted: await deleteSearch(db, id) };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SEARCH_LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: ["jobs", "inbox"] });
    },
  });
}

export function useCheckDuplicate() {
  return useMutation<
    boolean,
    Error,
    { title: string; location: string; country: string; excludeId?: string }
  >({
    mutationFn: async ({ title, location, country, excludeId }) => {
      const db = await getDb();
      return checkDuplicate(db, title, location, country, excludeId);
    },
  });
}
