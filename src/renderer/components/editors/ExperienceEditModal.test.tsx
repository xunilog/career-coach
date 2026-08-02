// @vitest-environment jsdom
// src/renderer/components/editors/ExperienceEditModal.test.tsx
// ---------------------------------------------------------------------------
// Tests for ExperienceEditModal — edit/delete experience form.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { Experience } from "../../../shared/state";

// ── Mock Tauri dialog plugin ─────────────────────────────────────────────

vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn().mockResolvedValue(true),
}));

// ── Mock TipTap editor ──────────────────────────────────────────────────

vi.mock("./MinimalTipTapEditor", () => ({
  MinimalTipTapEditor: ({ placeholder }: { placeholder: string }) =>
    `<div data-testid="tiptap-editor" data-placeholder="${placeholder}"></div>`,
}));

// ── Polyfills ──────────────────────────────────────────────────────────

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

  global.ResizeObserver = vi.fn(function ResizeObserver() {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }) as unknown as typeof ResizeObserver;

  // Mantine Autosize uses document.fonts
  Object.defineProperty(document, "fonts", {
    writable: true,
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Dynamic import after mocks ─────────────────────────────────────────

const { ExperienceEditModal } = await import("./ExperienceEditModal");

// ── Helpers ────────────────────────────────────────────────────────────

const sampleExperience: Experience = {
  id: "exp-test-123",
  company: "Acme Corp",
  title: "Senior Engineer",
  startDate: "2020-01",
  endDate: "2023-06",
  sector: "Tech",
  raciRoles: ["Responsible"],
  keyProjects: ["Project X"],
  quantifiedAchievements: ["Increased revenue 20%"],
  skillsDemonstrated: [{ name: "TypeScript", category: "technical" as const }],
  challenges: "Scaling the team",
  reasonForLeaving: "New opportunities",
  rawNotes: "Great experience",
};

// ── Tests ──────────────────────────────────────────────────────────────

describe("ExperienceEditModal - delete", () => {
  it("shows delete button with outline variant and deletes on confirm", async () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    const { ask } = await import("@tauri-apps/plugin-dialog");

    render(
      <MantineProvider>
        <ExperienceEditModal
          opened={true}
          onClose={onClose}
          experience={sampleExperience}
          onSave={vi.fn()}
          onDelete={onDelete}
        />
      </MantineProvider>,
    );

    // Delete button should be visible with outline variant
    const deleteBtn = screen.getByRole("button", { name: "Delete Experience" });
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn.getAttribute("data-variant")).toBe("outline");

    // Click delete button
    fireEvent.click(deleteBtn);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(ask).toHaveBeenCalledWith("Delete this experience?", {
        title: "Delete Experience",
        kind: "warning",
      });
    });

    // onDelete should be called with the correct ID
    expect(onDelete).toHaveBeenCalledWith("exp-test-123");

    // Modal should close after delete
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
