// src/renderer/components/job-detail/StatusDropdown.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for StatusDropdown — option filtering, emoji display, mutation trigger.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { StatusDropdown } from "./StatusDropdown";

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

const STATUS_EMOJI: Record<string, string> = {
  "--": "—",
  Saved: "💾",
  "Applied 📤": "📤",
  "Interview 🤝": "🤝",
  "Offer 🎉": "🎉",
  "Rejected ❌": "❌",
  Archived: "📦",
  "Closed 🔒": "🔒",
};

describe("StatusDropdown", () => {
  it("renders current status with emoji as value", () => {
    renderWithProvider(
      <StatusDropdown currentStatus="Applied 📤" onChange={vi.fn()} disabled={false} />,
    );

    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe("Applied 📤");
  });

  it("is disabled when disabled prop is true", () => {
    renderWithProvider(<StatusDropdown currentStatus="--" onChange={vi.fn()} disabled={true} />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("is enabled when disabled prop is false", () => {
    renderWithProvider(<StatusDropdown currentStatus="--" onChange={vi.fn()} disabled={false} />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  function expectedLabel(status: string): string {
    const emoji = STATUS_EMOJI[status] ?? "";
    return status.includes(emoji) ? status : `${emoji} ${status}`;
  }

  it("shows value with emoji for each status", () => {
    for (const status of Object.keys(STATUS_EMOJI)) {
      const { container } = renderWithProvider(
        <StatusDropdown currentStatus={status} onChange={vi.fn()} disabled={false} />,
      );

      const input = container.querySelector("input");
      expect(input?.value).toBe(expectedLabel(status));
    }
  });

  it("renders without crashing for all valid statuses", () => {
    for (const status of Object.keys(STATUS_EMOJI)) {
      const { container } = renderWithProvider(
        <StatusDropdown currentStatus={status} onChange={vi.fn()} disabled={false} />,
      );

      const input = container.querySelector("input");
      expect(input).toBeDefined();
      expect(input?.value).toBe(expectedLabel(status));
    }
  });
});
