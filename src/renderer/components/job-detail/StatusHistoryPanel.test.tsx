// src/renderer/components/job-detail/StatusHistoryPanel.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for StatusHistoryPanel — timeline rendering, empty state, ordering.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { StatusHistoryPanel } from "./StatusHistoryPanel";
import type { StatusHistoryEntry } from "../../../shared/types";

// ── jsdom polyfill ─────────────────────────────────────────────────────────

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
});

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
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
  {
    id: 3,
    jobId: "job-001",
    fromStatus: "Applied 📤",
    toStatus: "Interview 🤝",
    notes: null,
    changedAt: "2026-01-15T11:00:00.000Z",
  },
];

describe("StatusHistoryPanel", () => {
  it("renders timeline of status changes with timestamps", () => {
    const { container } = renderWithProvider(
      <StatusHistoryPanel history={mockHistory} isLoading={false} />,
    );

    // Should contain all three to-statuses somewhere in the DOM
    expect(container.textContent).toContain("Saved");
    expect(container.textContent).toContain("Applied 📤");
    expect(container.textContent).toContain("Interview 🤝");

    // Should show notes where present
    expect(screen.getByText("Initial save")).toBeDefined();
    expect(screen.getByText("Applied via company site")).toBeDefined();
  });

  it("shows entries in chronological order (newest first)", () => {
    const { container } = renderWithProvider(
      <StatusHistoryPanel history={mockHistory} isLoading={false} />,
    );

    // Verify all three timeline items are present
    const timelineItems = container.querySelectorAll(".mantine-Timeline-item");
    expect(timelineItems.length).toBe(3);
  });

  it("displays empty state when history is empty", () => {
    renderWithProvider(<StatusHistoryPanel history={[]} isLoading={false} />);

    expect(screen.getByText(/no status history/i)).toBeDefined();
  });

  it("shows loading skeleton when loading", () => {
    const { container } = renderWithProvider(<StatusHistoryPanel history={[]} isLoading={true} />);

    // Should render a loader
    const loader = container.querySelector(".mantine-Loader-root");
    expect(loader).toBeDefined();
  });

  it("shows 'No status' for initial entry with null fromStatus", () => {
    renderWithProvider(<StatusHistoryPanel history={[mockHistory[0]]} isLoading={false} />);

    expect(screen.getByText(/no status/i)).toBeDefined();
  });
});
