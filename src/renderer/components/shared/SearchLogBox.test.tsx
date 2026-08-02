// @vitest-environment jsdom
// src/renderer/components/shared/SearchLogBox.test.tsx
// ---------------------------------------------------------------------------
// Tests for SearchLogBox — accumulating log display during search.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { SearchLogBox } from "./SearchLogBox";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("SearchLogBox", () => {
  it("renders all log lines", () => {
    const logs = ["Starting search...", "Searching: dev jobs in Belgium", "Found 15 jobs (5 new)."];

    renderWithProvider(<SearchLogBox logs={logs} isSearching={true} />);

    expect(screen.getByText("Starting search...")).toBeDefined();
    expect(screen.getByText("Searching: dev jobs in Belgium")).toBeDefined();
    expect(screen.getByText("Found 15 jobs (5 new).")).toBeDefined();
  });

  it("shows nothing when logs is empty", () => {
    renderWithProvider(<SearchLogBox logs={[]} isSearching={false} />);

    // Component returns null, so no log lines or Paper should be visible
    expect(screen.queryByText("Starting search...")).toBeNull();
    expect(screen.queryByText("Search complete.")).toBeNull();
  });

  it("shows a 'complete' line when not searching but logs exist", () => {
    const logs = ["Starting search...", "Found 5 jobs."];

    renderWithProvider(<SearchLogBox logs={logs} isSearching={false} />);

    expect(screen.getByText("Search complete.")).toBeDefined();
  });

  it("does not show 'complete' line when still searching", () => {
    const logs = ["Starting search..."];

    renderWithProvider(<SearchLogBox logs={logs} isSearching={true} />);

    expect(screen.queryByText("Search complete.")).toBeNull();
  });
});
