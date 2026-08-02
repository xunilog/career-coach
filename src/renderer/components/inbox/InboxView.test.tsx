// src/renderer/components/inbox/InboxView.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for InboxView — inbox with virtualized job list and fixed toolbar.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

// ── Mock Mantine hooks ──────────────────────────────────────────────────────

vi.mock("@mantine/hooks", () => ({
  useViewportSize: () => ({ height: 800, width: 1200 }),
  useElementSize: () => ({ ref: vi.fn(), height: 80, width: 1200 }),
}));

// ── Mock useVirtualizer ──────────────────────────────────────────────────────

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(
    ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
      const rowSize = estimateSize();
      const items = Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * rowSize,
        size: rowSize,
        key: String(i),
      }));
      return {
        getVirtualItems: () => items,
        getTotalSize: () => count * rowSize,
        measureElement: vi.fn(),
      };
    },
  ),
}));

// ── Mock hooks ───────────────────────────────────────────────────────────────

const { useInboxQuery } = vi.hoisted(() => ({
  useInboxQuery: vi.fn(),
}));
vi.mock("../../hooks/useInboxQueries", () => ({ useInboxQuery }));

const { useMarkSeen } = vi.hoisted(() => ({
  useMarkSeen: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock("../../hooks/useJobQueries", () => ({ useMarkSeen }));

vi.mock("../../hooks/useSearchExecution", () => ({
  useSearchExecution: () => ({ runAll: vi.fn() }),
}));

vi.mock("../../stores/jobSearchStore", () => ({
  useJobSearchStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      searchRuns: {} as Record<string, { logs: string[] }>,
      viewStates: {} as Record<string, unknown>,
      setViewState: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
  inboxViewStateKey: () => "__inbox__",
  SEARCH_ALL_KEY: "__all__",
}));

vi.mock("../shared/SearchLogBox", () => ({
  SearchLogBox: () => <div data-testid="search-log-box" />,
}));

vi.mock("../job-detail/JobDetailOverlay", () => ({
  JobDetailOverlay: ({
    jobId,
    onClose,
  }: {
    jobId: string;
    searchId: string;
    onClose: () => void;
  }) => (
    <div data-testid="job-detail-overlay">
      <span data-testid="overlay-job-id">{jobId}</span>
      <button data-testid="overlay-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

// ── Polyfills ────────────────────────────────────────────────────────────────

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Dynamic import after mocks
const { InboxView } = await import("./InboxView");

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderInbox() {
  return render(
    <MantineProvider>
      <InboxView />
    </MantineProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("InboxView", () => {
  describe("Toolbar", () => {
    it("renders the Inbox title", () => {
      useInboxQuery.mockReturnValue({ data: [], isLoading: false });
      renderInbox();
      expect(screen.getByText("Inbox")).toBeDefined();
    });

    it('renders "Search All" button', () => {
      useInboxQuery.mockReturnValue({ data: [], isLoading: false });
      renderInbox();
      expect(screen.getByText("Search All")).toBeDefined();
    });

    it("shows job count badge counting only unread jobs", () => {
      useInboxQuery.mockReturnValue({
        data: [
          {
            id: "1",
            title: "FE",
            company: "A",
            searchName: "S1",
            searchId: "s1",
            isNew: true,
            foundAt: new Date().toISOString(),
            status: "--",
            fit: null,
          },
          {
            id: "2",
            title: "BE",
            company: "B",
            searchName: "S2",
            searchId: "s2",
            isNew: false,
            foundAt: new Date().toISOString(),
            status: "--",
            fit: null,
          },
        ],
        isLoading: false,
      });
      renderInbox();
      expect(screen.getByText("1 new")).toBeDefined();
    });

    it("shows read jobs in the table alongside unread ones", () => {
      useInboxQuery.mockReturnValue({
        data: [
          {
            id: "1",
            title: "New Job",
            company: "A",
            searchName: "S1",
            searchId: "s1",
            isNew: true,
            foundAt: new Date().toISOString(),
            status: "--",
            fit: null,
          },
          {
            id: "2",
            title: "Read Job",
            company: "B",
            searchName: "S2",
            searchId: "s2",
            isNew: false,
            foundAt: new Date().toISOString(),
            status: "--",
            fit: null,
          },
        ],
        isLoading: false,
      });
      renderInbox();

      expect(screen.getByText("New Job")).toBeDefined();
      expect(screen.getByText("Read Job")).toBeDefined();
      expect(screen.getByText("1 new")).toBeDefined();
    });
  });

  describe("SearchLogBox", () => {
    it("renders when searching", () => {
      useInboxQuery.mockReturnValue({ data: [], isLoading: false });
      renderInbox();
      expect(screen.getByTestId("search-log-box")).toBeDefined();
    });
  });

  describe("Data table", () => {
    it("renders column headers", () => {
      useInboxQuery.mockReturnValue({
        data: [
          {
            id: "1",
            title: "Dev",
            company: "Acme",
            searchName: "S1",
            searchId: "s1",
            isNew: true,
            foundAt: new Date().toISOString(),
            status: "--",
            fit: null,
          },
        ],
        isLoading: false,
      });
      renderInbox();

      expect(screen.getByText("Search")).toBeDefined();
      expect(screen.getByText("Job Title")).toBeDefined();
      expect(screen.getByText("Company")).toBeDefined();
      expect(screen.getByText("Fit")).toBeDefined();
      expect(screen.getByText("Date Found")).toBeDefined();
    });

    it("renders job data", () => {
      useInboxQuery.mockReturnValue({
        data: [
          {
            id: "1",
            title: "Frontend Dev",
            company: "Acme Corp",
            searchName: "Dev Search",
            searchId: "s1",
            isNew: true,
            foundAt: new Date().toISOString(),
            status: "--",
            fit: null,
          },
        ],
        isLoading: false,
      });
      renderInbox();

      expect(screen.getByText("Frontend Dev")).toBeDefined();
      expect(screen.getByText("Acme Corp")).toBeDefined();
      expect(screen.getByText("Dev Search")).toBeDefined();
    });

    it("shows job detail overlay and marks seen on row click", () => {
      const mockMutate = vi.fn();
      (useMarkSeen as ReturnType<typeof vi.fn>).mockReturnValue({ mutate: mockMutate });

      const job = {
        id: "j1",
        searchId: "s1",
        title: "Dev",
        company: "A",
        searchName: "S",
        isNew: true,
        foundAt: new Date().toISOString(),
        status: "--",
        fit: null,
      };
      useInboxQuery.mockReturnValue({ data: [job], isLoading: false });
      renderInbox();

      fireEvent.click(screen.getByText("Dev"));

      expect(mockMutate).toHaveBeenCalledWith("j1");
      expect(screen.getByTestId("job-detail-overlay")).toBeDefined();
      expect(screen.getByTestId("overlay-job-id").textContent).toBe("j1");
    });

    it("closes overlay when close is triggered", () => {
      const mockMutate = vi.fn();
      (useMarkSeen as ReturnType<typeof vi.fn>).mockReturnValue({ mutate: mockMutate });

      const job = {
        id: "j1",
        searchId: "s1",
        title: "Dev",
        company: "A",
        searchName: "S",
        isNew: true,
        foundAt: new Date().toISOString(),
        status: "--",
        fit: null,
      };
      useInboxQuery.mockReturnValue({ data: [job], isLoading: false });
      renderInbox();

      fireEvent.click(screen.getByText("Dev"));
      expect(screen.getByTestId("job-detail-overlay")).toBeDefined();

      fireEvent.click(screen.getByTestId("overlay-close"));
      expect(screen.queryByTestId("job-detail-overlay")).toBeNull();
    });
  });

  describe("Loading state", () => {
    it("shows skeletons when loading", () => {
      useInboxQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderInbox();
      // Skeletons should be present
      const skeletons = document.querySelectorAll(".mantine-Skeleton-root");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Error state", () => {
    it("shows error message when query fails", () => {
      useInboxQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network error"),
      });
      renderInbox();
      expect(screen.getByText(/Failed to load/)).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when no jobs", () => {
      useInboxQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
      renderInbox();
      expect(screen.getByText(/No jobs in inbox/)).toBeDefined();
    });
  });
});
