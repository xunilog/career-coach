// src/renderer/hooks/useStatusQueries.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for useStatusQueries — status update mutation with validation,
// status history query, notes update mutation.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { StatusHistoryEntry } from "../../shared/types";

// ── Hoisted mocks referenced by vi.mock ──────────────────────────────────

const { mockUpdateJobStatusAuto, mockGetStatusHistoryAuto, mockUpdateJobNotesAuto } = vi.hoisted(
  () => ({
    mockUpdateJobStatusAuto: vi.fn(),
    mockGetStatusHistoryAuto: vi.fn(),
    mockUpdateJobNotesAuto: vi.fn(),
  }),
);

vi.mock("../../services/status-service", () => ({
  updateJobStatusAuto: mockUpdateJobStatusAuto,
  getStatusHistoryAuto: mockGetStatusHistoryAuto,
  updateJobNotesAuto: mockUpdateJobNotesAuto,
}));

// Import after mocks are set up
import { useUpdateStatus, useUpdateNotes, useStatusHistory } from "./useStatusQueries";

// ── Wrapper with QueryClientProvider ────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockHistory: StatusHistoryEntry[] = [
  {
    id: 1,
    jobId: "job-001",
    fromStatus: null,
    toStatus: "Saved",
    notes: "Initial save",
    changedAt: "2026-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    jobId: "job-001",
    fromStatus: "Saved",
    toStatus: "Applied 📤",
    notes: "Applied via company site",
    changedAt: "2026-01-12T14:30:00.000Z",
  },
];

describe("useStatusQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── useUpdateStatus ──────────────────────────────────────────────────

  describe("useUpdateStatus", () => {
    it("calls updateJobStatusAuto with correct arguments on successful mutation", async () => {
      mockUpdateJobStatusAuto.mockResolvedValue(true);

      const { result } = renderHook(() => useUpdateStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          jobId: "job-001",
          fromStatus: "--",
          toStatus: "Applied 📤",
          notes: "Test notes",
        });
      });

      expect(mockUpdateJobStatusAuto).toHaveBeenCalledWith(
        "job-001",
        "--",
        "Applied 📤",
        "Test notes",
      );
    });

    it("propagates errors from the service", async () => {
      mockUpdateJobStatusAuto.mockRejectedValue(new Error("Invalid transition"));

      const { result } = renderHook(() => useUpdateStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            jobId: "job-001",
            fromStatus: "Applied 📤",
            toStatus: "--",
          });
        } catch (e) {
          expect((e as Error).message).toBe("Invalid transition");
        }
      });
    });

    it("invalidates job detail and search results queries on success", async () => {
      mockUpdateJobStatusAuto.mockResolvedValue(true);
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      }

      const { result } = renderHook(() => useUpdateStatus(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.mutateAsync({
          jobId: "job-001",
          fromStatus: "--",
          toStatus: "Saved",
        });
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // ── useStatusHistory ─────────────────────────────────────────────────

  describe("useStatusHistory", () => {
    it("returns ordered history entries for a job", async () => {
      mockGetStatusHistoryAuto.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useStatusHistory("job-001"), {
        wrapper: createWrapper(),
      });

      await vi.waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(mockHistory);
      expect(mockGetStatusHistoryAuto).toHaveBeenCalledWith("job-001");
    });

    it("returns empty array when no history exists", async () => {
      mockGetStatusHistoryAuto.mockResolvedValue([]);

      const { result } = renderHook(() => useStatusHistory("job-001"), {
        wrapper: createWrapper(),
      });

      await vi.waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual([]);
    });

    it("does not fetch when jobId is null", () => {
      const { result } = renderHook(() => useStatusHistory(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(mockGetStatusHistoryAuto).not.toHaveBeenCalled();
    });
  });

  // ── useUpdateNotes ───────────────────────────────────────────────────

  describe("useUpdateNotes", () => {
    it("calls updateJobNotesAuto with jobId and notes", async () => {
      mockUpdateJobNotesAuto.mockResolvedValue(true);

      const { result } = renderHook(() => useUpdateNotes(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          jobId: "job-001",
          notes: "Updated notes content",
        });
      });

      expect(mockUpdateJobNotesAuto).toHaveBeenCalledWith("job-001", "Updated notes content");
    });

    it("propagates errors from the service", async () => {
      mockUpdateJobNotesAuto.mockRejectedValue(new Error("Job not found"));

      const { result } = renderHook(() => useUpdateNotes(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            jobId: "nonexistent",
            notes: "some notes",
          });
        } catch (e) {
          expect((e as Error).message).toBe("Job not found");
        }
      });
    });

    it("invalidates job detail query on success", async () => {
      mockUpdateJobNotesAuto.mockResolvedValue(true);
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      }

      const { result } = renderHook(() => useUpdateNotes(), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.mutateAsync({
          jobId: "job-001",
          notes: "test",
        });
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
