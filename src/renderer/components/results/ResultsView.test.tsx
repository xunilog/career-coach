// src/renderer/components/results/ResultsView.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ResultsView — virtualized job results with fixed toolbar.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";

// ── Mock Tauri dialog plugin ─────────────────────────────────────────────────

vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn().mockResolvedValue(true),
}));

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

// ── Mock router ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const { useParams } = vi.hoisted(() => ({
  useParams: vi.fn(),
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as object),
    useParams,
    useNavigate: () => mockNavigate,
  };
});

// ── Mock hooks ───────────────────────────────────────────────────────────────

const { useSearchResultsQuery, useMarkSeen } = vi.hoisted(() => ({
  useSearchResultsQuery: vi.fn(),
  useMarkSeen: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock("../../hooks/useJobQueries", () => ({
  useSearchResultsQuery,
  useMarkAllSeen: () => ({ mutate: vi.fn() }),
  useScoreSearch: () => ({ mutate: vi.fn() }),
  useMarkSeen,
}));

vi.mock("../../hooks/useSearchQueries", () => ({
  useSearch: () => ({
    data: { id: "s1", title: "Dev Jobs", location: "Belgium", schedule: "daily" },
  }),
  useDeleteSearch: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../../hooks/useSearchExecution", () => ({
  useSearchExecution: () => ({ runSingle: vi.fn() }),
}));

const { useJobSearchStore } = vi.hoisted(() => ({
  useJobSearchStore: vi.fn(),
}));
vi.mock("../../stores/jobSearchStore", () => ({
  useJobSearchStore,
  viewStateKey: (id: string) => id,
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
const { ResultsView } = await import("./ResultsView");

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeJob(
  overrides?: Partial<{
    id: string;
    title: string;
    company: string;
    fit: string | null;
    isNew: boolean;
    status: string;
  }>,
) {
  return {
    id: overrides?.id ?? "j1",
    searchId: "s1",
    title: overrides?.title ?? "Software Engineer",
    company: overrides?.company ?? "Acme Corp",
    location: "Brussels",
    salary: null,
    fit: overrides?.fit ?? null,
    source: "indeed+linkedin",
    applyUrl: null,
    foundAt: new Date().toISOString(),
    status: overrides?.status ?? "--",
    description: "A job description.",
    notes: null,
    isNew: overrides?.isNew ?? false,
  };
}

function renderResults() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/search/s1"]}>
        <ResultsView />
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ResultsView", () => {
  beforeEach(() => {
    useParams.mockReturnValue({ searchId: "s1" });
    useJobSearchStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      const state = {
        showAll: false,
        setShowAll: vi.fn(),
        openModal: vi.fn(),
        searchRuns: {} as Record<string, { logs: string[] }>,
        viewStates: {} as Record<string, unknown>,
        setViewState: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
  });

  describe("Toolbar", () => {
    it("renders search title", () => {
      useSearchResultsQuery.mockReturnValue({ data: [], isLoading: false });
      renderResults();
      expect(screen.getByText("Dev Jobs")).toBeDefined();
    });

    it("renders location and schedule", () => {
      useSearchResultsQuery.mockReturnValue({ data: [], isLoading: false });
      renderResults();
      expect(screen.getByText(/Belgium/)).toBeDefined();
      expect(screen.getByText(/daily/)).toBeDefined();
    });

    it('renders "Search Now" button', () => {
      useSearchResultsQuery.mockReturnValue({ data: [], isLoading: false });
      renderResults();
      expect(screen.getByText("Search Now")).toBeDefined();
    });

    it('renders "Show All" switch', () => {
      useSearchResultsQuery.mockReturnValue({ data: [], isLoading: false });
      renderResults();
      expect(screen.getByText("Show All")).toBeDefined();
    });

    it('renders "Mark All Seen" when jobs have isNew', () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ isNew: true })],
        isLoading: false,
      });
      renderResults();
      expect(screen.getByText("Mark All Seen")).toBeDefined();
    });
  });

  describe("Data table", () => {
    it("renders column headers", () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob()],
        isLoading: false,
      });
      renderResults();

      expect(screen.getByText("Source")).toBeDefined();
      expect(screen.getByText("Title")).toBeDefined();
      expect(screen.getByText("Location")).toBeDefined();
      expect(screen.getByText("Company")).toBeDefined();
      expect(screen.getByText("Fit")).toBeDefined();
      expect(screen.getByText("Status")).toBeDefined();
    });

    it("renders job data", () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ title: "Frontend Dev", company: "ACME" })],
        isLoading: false,
      });
      renderResults();

      expect(screen.getByText("Frontend Dev")).toBeDefined();
      expect(screen.getByText("ACME")).toBeDefined();
    });

    it("shows job detail overlay and marks seen on row click", () => {
      const mockMutate = vi.fn();
      (useMarkSeen as ReturnType<typeof vi.fn>).mockReturnValue({ mutate: mockMutate });

      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ id: "job-123", title: "Dev" })],
        isLoading: false,
      });
      renderResults();

      fireEvent.click(screen.getByText("Dev"));

      expect(mockMutate).toHaveBeenCalledWith("job-123");
      expect(screen.getByTestId("job-detail-overlay")).toBeDefined();
    });

    it("closes overlay when close is triggered", () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ id: "job-123", title: "Dev" })],
        isLoading: false,
      });
      renderResults();

      fireEvent.click(screen.getByText("Dev"));
      expect(screen.getByTestId("job-detail-overlay")).toBeDefined();

      fireEvent.click(screen.getByTestId("overlay-close"));
      expect(screen.queryByTestId("job-detail-overlay")).toBeNull();
    });

    it("closes overlay when switching searches", () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ id: "job-123", title: "Dev" })],
        isLoading: false,
      });
      const { rerender } = renderResults();

      fireEvent.click(screen.getByText("Dev"));
      expect(screen.getByTestId("job-detail-overlay")).toBeDefined();

      // Switch to a different search
      useParams.mockReturnValue({ searchId: "s2" });
      rerender(
        <MantineProvider>
          <MemoryRouter initialEntries={["/search/s2"]}>
            <ResultsView />
          </MemoryRouter>
        </MantineProvider>,
      );

      expect(screen.queryByTestId("job-detail-overlay")).toBeNull();
    });

    it("restores saved sort state when switching searches", () => {
      useJobSearchStore.mockImplementation((selector?: (state: unknown) => unknown) => {
        const state = {
          showAll: false,
          setShowAll: vi.fn(),
          openModal: vi.fn(),
          searchRuns: {} as Record<string, { logs: string[] }>,
          viewStates: { s2: { sortField: "company", sortDir: "desc" } } as Record<string, unknown>,
          setViewState: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ title: "Dev" })],
        isLoading: false,
      });
      const { rerender } = renderResults();

      // Switch to s2 which has saved sort state
      useParams.mockReturnValue({ searchId: "s2" });
      rerender(
        <MantineProvider>
          <MemoryRouter initialEntries={["/search/s2"]}>
            <ResultsView />
          </MemoryRouter>
        </MantineProvider>,
      );

      // The Company column should show a sort indicator (desc arrow)
      const companyHeader = screen.getByText("Company").closest("div");
      expect(companyHeader?.querySelector("svg")).toBeTruthy();
    });

    it("shows dimmed opacity for non-active jobs", () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ id: "j1", status: "Archived", title: "Old Job" })],
        isLoading: false,
      });
      const { container } = renderResults();

      const row = container.querySelector('[data-index="0"]') as HTMLElement;
      expect(row).toBeTruthy();
      expect(row.style.opacity).toBe("0.5");
    });
  });

  describe("Sort", () => {
    it("fires sort when a sortable column header is clicked", () => {
      useSearchResultsQuery.mockReturnValue({
        data: [makeJob({ title: "A" }), makeJob({ id: "j2", title: "B" })],
        isLoading: false,
      });
      renderResults();

      fireEvent.click(screen.getByText("Title"));
      // After sorting, the first row should contain "A"
      expect(screen.getByText("A")).toBeDefined();
    });
  });

  describe("Loading state", () => {
    it("shows skeleton table when loading", () => {
      useSearchResultsQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderResults();

      const skeletons = document.querySelectorAll(".mantine-Skeleton-root");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Error state", () => {
    it("shows error message", () => {
      useSearchResultsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      renderResults();

      expect(screen.getByText("Failed to load results.")).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when no jobs and search exists", () => {
      useSearchResultsQuery.mockReturnValue({ data: [], isLoading: false });
      renderResults();

      expect(screen.getByText("No results yet")).toBeDefined();
    });
  });

  describe("SearchLogBox", () => {
    it("renders when searching", () => {
      useSearchResultsQuery.mockReturnValue({ data: [], isLoading: false });
      renderResults();
      expect(screen.getByTestId("search-log-box")).toBeDefined();
    });
  });
});
