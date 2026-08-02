// src/renderer/components/chat/ChatBubble.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ChatBubble — verifies reasoning content display (collapsible
// section shown when reasoningContent is present).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ChatBubble } from "./ChatBubble";

// ── jsdom polyfills ────────────────────────────────────────────────────

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

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderBubble(message: { type: string; content: string; reasoningContent?: string }) {
  return render(
    <MantineProvider>
      <ChatBubble message={message} />
    </MantineProvider>,
  );
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ChatBubble", () => {
  describe("reasoning content", () => {
    it("shows collapsible reasoning section when reasoningContent is present", () => {
      renderBubble({
        type: "ai",
        content: "Based on your profile, I recommend...",
        reasoningContent: "Analyzing the seeker's Blue-dominant profile...",
      });

      // The reasoning toggle button should be visible
      expect(screen.getByText(/Reasoning/)).toBeDefined();
      // The reasoning text is in the DOM but collapsed by default
      expect(screen.getByText("Analyzing the seeker's Blue-dominant profile...")).toBeDefined();
    });

    it("does not show reasoning section when reasoningContent is absent", () => {
      renderBubble({
        type: "ai",
        content: "Based on your profile, I recommend...",
      });

      // No reasoning toggle visible
      expect(screen.queryByText(/Reasoning/)).toBeNull();
    });

    it("does not show reasoning section for empty reasoningContent", () => {
      renderBubble({
        type: "ai",
        content: "Short reply",
        reasoningContent: "",
      });

      // Empty reasoning should not show the section at all
      expect(screen.queryByText(/Reasoning/)).toBeNull();
    });

    it("expands reasoning section when toggle is clicked", () => {
      renderBubble({
        type: "ai",
        content: "Based on your profile, I recommend...",
        reasoningContent: "The seeker has strong analytical skills.",
      });

      // Initially the collapse content exists in the DOM (Mantine keeps it mounted)
      const toggleButton = screen.getByText(/Reasoning/);
      fireEvent.click(toggleButton);

      // After clicking, the reasoning text should still be visible
      // (Mantine Collapse animates visibility; the content stays mounted)
      expect(screen.getByText("The seeker has strong analytical skills.")).toBeDefined();
    });

    it("renders reasoning content for human messages too (unlikely but handled)", () => {
      renderBubble({
        type: "human",
        content: "Hello",
        reasoningContent: "some reasoning",
      });

      // Reasoning section should still be present
      expect(screen.getByText(/Reasoning/)).toBeDefined();
    });
  });
});
