// src/renderer/hooks/useSearchExecution.test.ts
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for useSearchExecution — verifies React Query cache invalidation
// when searches complete.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockRunSingleSearch, mockListen } = vi.hoisted(() => ({
  mockRunSingleSearch: vi.fn().mockResolvedValue({ total: 10, new: 5 }),
  mockListen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("../../services/search-executor", () => ({
  runSingleSearch: mockRunSingleSearch,
  runAllSearches: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}));

// Import after mocks
import { useSearchExecution } from "./useSearchExecution";
import { useJobSearchStore } from "../stores/jobSearchStore";

// ── Wrapper ────────────────────────────────────────────────────────────────

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useSearchExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunSingleSearch.mockResolvedValue({ total: 10, new: 5 });
    mockListen.mockResolvedValue(() => {});
    useJobSearchStore.setState({ searchRuns: {} });
  });

  it("invalidates jobs query cache after runSingle completes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSearchExecution(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.runSingle("search-1");
    });

    expect(mockRunSingleSearch).toHaveBeenCalledWith("search-1", expect.any(String));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
  });
});
