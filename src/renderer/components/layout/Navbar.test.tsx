// src/renderer/components/layout/Navbar.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for CareerNavbar — sidebar navigation with step gating, search list,
// and inbox navigation. Verifies active state, link presence, and navigation.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { CareerNavbar } from "./Navbar";

// ── Mock stores and hooks ──────────────────────────────────────────────────

// Mock useCareerState hooks
vi.mock("../../hooks/useCareerState", () => ({
  useProfileComplete: () => true,
  useHasExperiences: () => true,
  useCanAccessResume: () => true,
  useResumeComplete: () => true,
}));

// Mock job search store
const mockSetActiveSearchId = vi.fn();
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
      setActiveSearchId: mockSetActiveSearchId,
      openModal: mockOpenModal,
      closeModal: vi.fn(),
      startSearchRun: vi.fn(),
      appendSearchLog: vi.fn(),
      clearSearchRun: vi.fn(),
      setShowAll: vi.fn(),
    };
    // When called with a selector, apply it; otherwise return whole state
    return selector ? selector(state) : state;
  }),
  SEARCH_ALL_KEY: "__all__",
}));

// Mock useSearchList + SearchModal hooks (SearchModal is mounted in NavPanel)
vi.mock("../../hooks/useSearchQueries", () => ({
  useSearchList: () => ({ data: [], isLoading: false }),
  useSearch: () => ({ data: undefined }),
  useCreateSearch: () => ({ mutateAsync: vi.fn() }),
  useUpdateSearch: () => ({ mutateAsync: vi.fn() }),
  useDeleteSearch: () => ({ mutateAsync: vi.fn() }),
  useCheckDuplicate: () => ({ mutateAsync: vi.fn().mockResolvedValue(false) }),
}));

// Mock useInboxQuery (NavPanel wires the inbox badge to it)
vi.mock("../../hooks/useInboxQueries", () => ({
  useInboxQuery: () => ({ data: [], isLoading: false }),
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

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderNavbar(initialRoute = "/") {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <CareerNavbar />
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CareerNavbar", () => {
  describe("Inbox active state", () => {
    it("is NOT active when viewing a non-inbox route like /profile", () => {
      renderNavbar("/profile");

      // The Inbox NavLink should not have the active data attribute.
      // Find it by the Badge text "0 new" which is the inbox label.
      const inboxBadges = screen.getAllByText(/0 new/i);
      const inboxNavLink = inboxBadges[0].closest("a") ?? inboxBadges[0].closest("button");
      expect(inboxNavLink).toBeTruthy();
      // Mantine NavLink sets data-active="true" when active
      expect(inboxNavLink?.getAttribute("data-active")).toBeNull();
    });

    it("is active when viewing /inbox", () => {
      renderNavbar("/inbox");

      const inboxBadges = screen.getAllByText(/0 new/i);
      const inboxNavLink = inboxBadges[0].closest("a") ?? inboxBadges[0].closest("button");
      expect(inboxNavLink).toBeTruthy();
      expect(inboxNavLink?.getAttribute("data-active")).toBe("true");
    });
  });

  describe("Section headers", () => {
    it('renders "About You" instead of "Steps"', () => {
      renderNavbar("/profile");

      expect(screen.getByText(/About You/i)).toBeDefined();
      expect(screen.queryByText(/^Steps$/)).toBeNull();
    });

    it('renders "Job Searches" with consistent section header styling', () => {
      renderNavbar("/profile");

      const aboutYou = screen.getByText(/About You/i);
      const jobSearches = screen.getByText(/Job Searches/i);

      // Both section headers should exist
      expect(aboutYou).toBeDefined();
      expect(jobSearches).toBeDefined();

      // Both should use the same size (xs) for consistency
      expect(aboutYou.getAttribute("data-size")).toBe("xs");
      expect(jobSearches.getAttribute("data-size")).toBe("xs");
    });
  });

  describe("Overview link", () => {
    it("renders an Overview link in the navbar", () => {
      renderNavbar("/profile");

      expect(screen.getByText(/Overview/i)).toBeDefined();
    });

    it("is active when viewing the root route /", () => {
      renderNavbar("/");

      const overviewLinks = screen.getAllByText(/Overview/i);
      const overviewNavLink = overviewLinks[0].closest("a") ?? overviewLinks[0].closest("button");
      expect(overviewNavLink?.getAttribute("data-active")).toBe("true");
    });
  });
});
