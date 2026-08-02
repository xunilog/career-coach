// src/renderer/stores/jobSearchStore.ts
// ---------------------------------------------------------------------------
// Zustand store for client-side search UI state only.
// Does NOT cache server data — that's TanStack Query's job.
// ---------------------------------------------------------------------------

import { create } from "zustand";

export type ModalMode = "create" | "edit";

export interface ViewState {
  sortField: string | null;
  sortDir: "asc" | "desc";
}

const INBOX_KEY = "__inbox__";

export function viewStateKey(searchId: string) {
  return searchId;
}

export function inboxViewStateKey() {
  return INBOX_KEY;
}

/** Special key for "Search All" runs (inbox, due-searches banner). */
export const SEARCH_ALL_KEY = "__all__";

export interface SearchRunState {
  logs: string[];
}

export interface JobSearchState {
  /** The search currently selected in the nav panel. */
  activeSearchId: string | null;
  /** Whether the create/edit modal is visible. */
  isModalOpen: boolean;
  /** The mode of the modal: "create" for new, "edit" for existing. */
  modalMode: ModalMode;
  /** The ID of the search being edited (only relevant when modalMode="edit"). */
  editingSearchId: string | null;
  /** Per-search execution state. Key is searchId or "__all__" for Search All. */
  searchRuns: Record<string, SearchRunState>;
  /** Whether to show all jobs (including non-active) in results. */
  showAll: boolean;
  /** Persisted view state (sort) keyed by searchId or "__inbox__". */
  viewStates: Record<string, Partial<ViewState>>;

  setActiveSearchId: (id: string | null) => void;
  openModal: (mode: ModalMode, searchId?: string) => void;
  closeModal: () => void;
  startSearchRun: (key: string) => void;
  appendSearchLog: (key: string, line: string) => void;
  clearSearchRun: (key: string) => void;
  setShowAll: (show: boolean) => void;
  setViewState: (key: string, update: Partial<ViewState>) => void;
}

export const useJobSearchStore = create<JobSearchState>((set) => ({
  activeSearchId: null,
  isModalOpen: false,
  modalMode: "create",
  editingSearchId: null,
  searchRuns: {},
  showAll: false,
  viewStates: {},

  setActiveSearchId: (id) => set({ activeSearchId: id }),

  openModal: (mode, searchId) =>
    set({
      isModalOpen: true,
      modalMode: mode,
      editingSearchId: searchId ?? null,
    }),

  closeModal: () =>
    set({
      isModalOpen: false,
      editingSearchId: null,
    }),

  startSearchRun: (key) =>
    set((state) => ({
      searchRuns: { ...state.searchRuns, [key]: { logs: [] } },
    })),

  appendSearchLog: (key, line) =>
    set((state) => {
      const run = state.searchRuns[key];
      if (!run) return state;
      return {
        searchRuns: {
          ...state.searchRuns,
          [key]: { logs: [...run.logs, line] },
        },
      };
    }),

  clearSearchRun: (key) =>
    set((state) => {
      const { [key]: _, ...rest } = state.searchRuns;
      return { searchRuns: rest };
    }),

  setShowAll: (show) => set({ showAll: show }),

  setViewState: (key, update) =>
    set((state) => ({
      viewStates: {
        ...state.viewStates,
        [key]: { ...state.viewStates[key], ...update },
      },
    })),
}));
