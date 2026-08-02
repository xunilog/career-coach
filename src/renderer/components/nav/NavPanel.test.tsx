// src/renderer/components/nav/NavPanel.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for NavPanel — the left navigation panel with job search list,
// inbox badge, and "Add" button. Verifies the SearchModal is mounted and
// wired to the Add/Edit buttons.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { NavPanel } from "./NavPanel";

// ── Mock SearchModal — renders a stable marker so we can assert it's mounted ─
vi.mock("../search/SearchModal", () => ({
  SearchModal: () => <div data-testid="search-modal" />,
}));

// ── Mock stores and hooks ──────────────────────────────────────────────────

const mockOpenModal = vi.fn();
vi.mock("../../stores/jobSearchStore", () => ({
  useJobSearchStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      activeSearchId: null,
      isModalOpen: false,
      modalMode: "create",
      editingSearchId: null,
      searchRuns: {} as Record<string, { logs: string[] }>,
      showAll: false,
      setActiveSearchId: vi.fn(),
      openModal: mockOpenModal,
      closeModal: vi.fn(),
      startSearchRun: vi.fn(),
      appendSearchLog: vi.fn(),
      clearSearchRun: vi.fn(),
      setShowAll: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
  SEARCH_ALL_KEY: "__all__",
}));

vi.mock("../../hooks/useSearchQueries", () => ({
  useSearchList: () => ({ data: [], isLoading: false }),
}));

const mockInboxData: {
  id: string;
  title: string;
  company: string;
  searchName: string;
  isNew: boolean;
}[] = [];
vi.mock("../../hooks/useInboxQueries", () => ({
  useInboxQuery: () => ({ data: mockInboxData, isLoading: false }),
}));

// ── jsdom polyfills ────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

const noop = () => {};

function renderNavPanel() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/"]}>
        <NavPanel onSelectSearch={noop} onSelectInbox={noop} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("NavPanel", () => {
  describe("Add button", () => {
    it("calls openModal('create') when clicked", () => {
      renderNavPanel();

      fireEvent.click(screen.getByText("Add"));

      expect(mockOpenModal).toHaveBeenCalledWith("create");
    });
  });

  describe("SearchModal", () => {
    it("is mounted so the Add button has somewhere to open", () => {
      renderNavPanel();

      expect(screen.getByTestId("search-modal")).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when no searches exist", () => {
      renderNavPanel();
      expect(screen.getByText("No searches yet.")).toBeDefined();
    });
  });

  describe("Inbox badge", () => {
    it("shows the real inbox count from useInboxQuery", () => {
      mockInboxData.length = 0;
      mockInboxData.push(
        { id: "1", title: "FE Dev", company: "A", searchName: "S1", isNew: true },
        { id: "2", title: "BE Dev", company: "B", searchName: "S2", isNew: true },
        { id: "3", title: "FS Dev", company: "C", searchName: "S3", isNew: true },
      );

      renderNavPanel();

      expect(screen.getByText("3 new")).toBeDefined();
    });

    it("shows 0 new when inbox is empty", () => {
      mockInboxData.length = 0;

      renderNavPanel();

      expect(screen.getByText("0 new")).toBeDefined();
    });
  });
});
