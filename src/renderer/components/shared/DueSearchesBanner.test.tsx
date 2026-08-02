// src/renderer/components/shared/DueSearchesBanner.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for DueSearchesBanner — renders count, Run now / Dismiss actions,
// hidden when no due searches.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { DueSearchesBanner } from "./DueSearchesBanner";

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

describe("DueSearchesBanner", () => {
  it("renders with count of due searches", () => {
    renderWithProvider(
      <DueSearchesBanner
        count={3}
        searches={[
          { id: "s1", title: "VP Growth" },
          { id: "s2", title: "Product Manager" },
          { id: "s3", title: "Engineering Manager" },
        ]}
        onRunNow={vi.fn()}
        onDismiss={vi.fn()}
        isRunning={false}
      />,
    );

    expect(screen.getByText(/3 searches are due/i)).toBeDefined();
  });

  it('shows singular "1 search is due" for count of 1', () => {
    renderWithProvider(
      <DueSearchesBanner
        count={1}
        searches={[{ id: "s1", title: "VP Growth" }]}
        onRunNow={vi.fn()}
        onDismiss={vi.fn()}
        isRunning={false}
      />,
    );

    expect(screen.getByText(/1 search is due/i)).toBeDefined();
  });

  it('"Run now" button triggers onRunNow callback', () => {
    const onRunNow = vi.fn();
    renderWithProvider(
      <DueSearchesBanner
        count={2}
        searches={[
          { id: "s1", title: "A" },
          { id: "s2", title: "B" },
        ]}
        onRunNow={onRunNow}
        onDismiss={vi.fn()}
        isRunning={false}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const runButton = buttons.find((b) => b.textContent?.includes("Run now"));
    expect(runButton).toBeDefined();
    runButton?.click();
    expect(onRunNow).toHaveBeenCalled();
  });

  it('"Dismiss" button triggers onDismiss callback', () => {
    const onDismiss = vi.fn();
    renderWithProvider(
      <DueSearchesBanner
        count={1}
        searches={[{ id: "s1", title: "Test" }]}
        onRunNow={vi.fn()}
        onDismiss={onDismiss}
        isRunning={false}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const dismissButton = buttons.find((b) => b.textContent?.includes("Dismiss"));
    expect(dismissButton).toBeDefined();
    dismissButton?.click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows loading state on "Run now" when running', () => {
    renderWithProvider(
      <DueSearchesBanner
        count={2}
        searches={[
          { id: "s1", title: "A" },
          { id: "s2", title: "B" },
        ]}
        onRunNow={vi.fn()}
        onDismiss={vi.fn()}
        isRunning={true}
      />,
    );

    // Run now button should show loading state
    const buttons = screen.getAllByRole("button");
    const runButton = buttons.find((b) => b.textContent?.includes("Running"));
    expect(runButton).toBeDefined();
  });
});
