// src/renderer/components/editors/ProfileEditor.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ProfileEditor — two-column layout with profile section display
// on the left and coach chat on the right. Each section has an edit button.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ProfileEditor } from "./ProfileEditor";

// ── Mock stores and hooks ──────────────────────────────────────────────────

vi.mock("../../stores/careerStore", () => ({
  useCareerStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      profile: {
        dominantColor: "Blue",
        secondaryColor: "Green",
        discProfile: "SC",
        careerDrivers: ["Growth", "Impact"],
        workStylePreferences: ["Collaborative", "Structured"],
        values: ["Integrity", "Excellence"],
        riskAppetite: "medium",
        riskProfileDetails: "Open to calculated risks in tech.",
        changeToleranceNotes: "Adapts well to change.",
        rawInsights: "Strong analytical mindset.",
      },
      profileMarkdown: "# Career Profile\n\n...",
      setProfileField: vi.fn(),
      setProfileFields: vi.fn(),
      setProfileMarkdown: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock CoachChatPanel — ProfileEditor delegates all chat logic to it
vi.mock("../chat/CoachChatPanel", () => ({
  CoachChatPanel: ({ placeholder }: { placeholder: string }) => (
    <div data-testid="coach-chat-panel">
      <input placeholder={placeholder} readOnly />
    </div>
  ),
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

  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });

  // Mantine Autosize uses document.fonts.addEventListener
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

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderProfileEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter>
          <ProfileEditor />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ProfileEditor", () => {
  it("renders profile section display on the left and chat panel on the right", () => {
    renderProfileEditor();

    // Section titles should be visible in the left panel
    expect(screen.getByText("Colors Profile")).toBeDefined();
    expect(screen.getByText("Career Drivers")).toBeDefined();
    expect(screen.getByText("Work Style Preferences")).toBeDefined();
    expect(screen.getByText("Core Values")).toBeDefined();
    expect(screen.getByText("Risk & Adaptability")).toBeDefined();
    expect(screen.getByText("Coach Notes")).toBeDefined();

    // Chat input should be visible in the right panel via CoachChatPanel
    expect(screen.getByPlaceholderText(/Tell the Profile Coach/i)).toBeDefined();
  });

  it("displays profile content in sections", () => {
    renderProfileEditor();

    // Colors content
    expect(screen.getByText(/Blue/)).toBeDefined();
    expect(screen.getByText(/Green/)).toBeDefined();

    // Career drivers as list items
    expect(screen.getByText("Growth")).toBeDefined();
    expect(screen.getByText("Impact")).toBeDefined();

    // Risk badge
    expect(screen.getByText("Medium Risk")).toBeDefined();

    // Coach notes raw text
    expect(screen.getByText("Strong analytical mindset.")).toBeDefined();
  });

  it("shows edit buttons for each section", () => {
    renderProfileEditor();

    // Each section should have an edit button (pencil icon)
    const editButtons = screen.getAllByLabelText(/Edit /);
    expect(editButtons.length).toBe(6); // 6 sections
  });

  it("does NOT render a full-page markdown editor", () => {
    renderProfileEditor();

    // The old MarkdownEditor should not be present
    expect(screen.queryByTestId("markdown-editor")).toBeNull();
  });

  // ── CoachChatPanel integration ──────────────────────────────────────

  describe("CoachChatPanel integration", () => {
    it("renders CoachChatPanel with profile configuration", () => {
      renderProfileEditor();

      // CoachChatPanel should be rendered
      const chatPanel = screen.getByTestId("coach-chat-panel");
      expect(chatPanel).toBeDefined();

      // It should receive the profile placeholder
      expect(screen.getByPlaceholderText(/Tell the Profile Coach/i)).toBeDefined();
    });
  });
});
