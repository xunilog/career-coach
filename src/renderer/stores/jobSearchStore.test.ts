// src/renderer/stores/jobSearchStore.test.ts
// ---------------------------------------------------------------------------
// Tests for JobSearchStore — Zustand client-side search UI state.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from "vitest";
import { useJobSearchStore } from "./jobSearchStore";

beforeEach(() => {
  useJobSearchStore.setState({
    activeSearchId: null,
    isModalOpen: false,
    modalMode: "create" as const,
    editingSearchId: null,
    searchRuns: {},
    showAll: false,
    viewStates: {},
  });
});

describe("searchRuns", () => {
  it("starts as an empty object", () => {
    expect(useJobSearchStore.getState().searchRuns).toEqual({});
  });

  it("startSearchRun creates an empty log entry", () => {
    useJobSearchStore.getState().startSearchRun("search-1");

    const state = useJobSearchStore.getState();
    expect(state.searchRuns).toEqual({ "search-1": { logs: [] } });
  });

  it("appendSearchLog adds a line to a running search", () => {
    const store = useJobSearchStore.getState();
    store.startSearchRun("search-1");
    store.appendSearchLog("search-1", "Starting search...");

    expect(useJobSearchStore.getState().searchRuns).toEqual({
      "search-1": { logs: ["Starting search..."] },
    });
  });

  it("appendSearchLog is a no-op for unknown keys", () => {
    useJobSearchStore.getState().appendSearchLog("nonexistent", "Line");

    expect(useJobSearchStore.getState().searchRuns).toEqual({});
  });

  it("appendSearchLog accumulates multiple lines", () => {
    const store = useJobSearchStore.getState();
    store.startSearchRun("search-1");
    store.appendSearchLog("search-1", "Line 1");
    store.appendSearchLog("search-1", "Line 2");
    store.appendSearchLog("search-1", "Line 3");

    expect(useJobSearchStore.getState().searchRuns["search-1"]?.logs).toEqual([
      "Line 1",
      "Line 2",
      "Line 3",
    ]);
  });

  it("clearSearchRun removes the run entry", () => {
    const store = useJobSearchStore.getState();
    store.startSearchRun("search-1");
    store.appendSearchLog("search-1", "Line 1");
    store.clearSearchRun("search-1");

    expect(useJobSearchStore.getState().searchRuns).toEqual({});
  });

  it("clearSearchRun only removes the specified key", () => {
    const store = useJobSearchStore.getState();
    store.startSearchRun("search-1");
    store.startSearchRun("__all__");
    store.appendSearchLog("search-1", "A");
    store.appendSearchLog("__all__", "B");
    store.clearSearchRun("search-1");

    const state = useJobSearchStore.getState();
    expect(state.searchRuns["search-1"]).toBeUndefined();
    expect(state.searchRuns["__all__"]?.logs).toEqual(["B"]);
  });
});

describe("viewStates", () => {
  it("stores sort state independently per search", () => {
    const store = useJobSearchStore.getState();

    store.setViewState("search-a", { sortField: "title", sortDir: "asc" });
    store.setViewState("search-b", { sortField: "company", sortDir: "desc" });

    const state = useJobSearchStore.getState();
    expect(state.viewStates["search-a"]).toEqual({
      sortField: "title",
      sortDir: "asc",
    });
    expect(state.viewStates["search-b"]).toEqual({
      sortField: "company",
      sortDir: "desc",
    });
  });

  it("merges partial updates without clobbering existing fields", () => {
    const store = useJobSearchStore.getState();

    store.setViewState("search-a", { sortField: "title", sortDir: "asc" });
    // Later, only sortField changes
    store.setViewState("search-a", { sortField: "company" });

    const state = useJobSearchStore.getState();
    expect(state.viewStates["search-a"]).toEqual({
      sortField: "company",
      sortDir: "asc",
    });
  });

  it("keeps inbox view state separate from search view states", () => {
    const store = useJobSearchStore.getState();

    store.setViewState("__inbox__", { sortField: "foundAt", sortDir: "desc" });
    store.setViewState("search-1", { sortField: "title", sortDir: "asc" });

    const state = useJobSearchStore.getState();
    expect(state.viewStates["__inbox__"]?.sortField).toBe("foundAt");
    expect(state.viewStates["search-1"]?.sortField).toBe("title");
  });
});
