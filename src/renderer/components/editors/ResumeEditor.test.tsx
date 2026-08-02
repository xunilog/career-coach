// src/components/editors/ResumeEditor.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ResumeEditor — two-column layout: section cards on the left,
// CoachChatPanel on the right. Experience section redirects to /experience.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { ResumeEditor } from "./ResumeEditor";

// ── Mock store ─────────────────────────────────────────────────────────────

const mockStore = {
  resumeData: {
    firstName: "Marie",
    lastName: "Dupont",
    phone: "",
    email: "marie@example.com",
    linkedin: "",
    otherNetworks: "",
    nationality: "French",
    country: "France",
    title: "Senior PM",
    bannerHighlights: "10 years in SaaS",
    keySkills: ["Product Strategy", "SQL"],
    education: [
      {
        id: "edu-1",
        institution: "HEC Paris",
        degree: "Master",
        field: "Management",
        startDate: "2012",
        endDate: "2015",
      },
    ],
    languages: [{ id: "lang-1", language: "French", proficiency: "native" }],
  },
  setResumeFields: vi.fn(),
  setResumeMarkdown: vi.fn(),
  saveToDisk: vi.fn(),
};

vi.mock("../../stores/careerStore", () => ({
  useCareerStore: vi.fn((selector?: (state: typeof mockStore) => unknown) => {
    return selector ? selector(mockStore) : mockStore;
  }),
}));

// ── Mock CoachChatPanel ────────────────────────────────────────────────────

vi.mock("../chat/CoachChatPanel", () => ({
  CoachChatPanel: ({
    coachType,
    forceAgent,
    emptyStateText,
    placeholder,
  }: {
    coachType: string;
    forceAgent?: string;
    emptyStateText: string;
    placeholder: string;
  }) => (
    <div data-testid="coach-chat-panel">
      <span data-testid="coach-type">{coachType}</span>
      <span data-testid="force-agent">{forceAgent}</span>
      <span data-testid="empty-state-text">{emptyStateText}</span>
      <span data-testid="placeholder">{placeholder}</span>
    </div>
  ),
}));

// ── Mock modals (they're rendered but closed by default) ──────────────────

vi.mock("./ResumePersonalInfoModal", () => ({
  ResumePersonalInfoModal: () => <div data-testid="personal-info-modal" />,
}));

vi.mock("./ResumeHighlightsModal", () => ({
  ResumeHighlightsModal: () => <div data-testid="highlights-modal" />,
}));

vi.mock("./ResumeEducationModal", () => ({
  ResumeEducationModal: () => <div data-testid="education-modal" />,
}));

vi.mock("./ResumeLanguagesModal", () => ({
  ResumeLanguagesModal: () => <div data-testid="languages-modal" />,
}));

vi.mock("./SectionEditModal", () => ({
  SectionEditModal: () => <div data-testid="section-edit-modal" />,
}));

// ── Mock ResumeDisplay to isolate layout tests ─────────────────────────────

vi.mock("./ResumeDisplay", () => ({
  ResumeDisplay: () => <div data-testid="resume-display">Resume sections</div>,
}));

// ── Mock Mantine hooks ─────────────────────────────────────────────────────

vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual("@mantine/hooks");
  return {
    ...actual,
    useViewportSize: vi.fn(() => ({ height: 900, width: 1440 })),
    useElementSize: vi.fn(() => ({ ref: vi.fn(), height: 50 })),
    useDebouncedCallback: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
  };
});

// ── jsdom polyfills ──────────────────────────────────────────────────────

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
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ── Wrapper ──────────────────────────────────────────────────────────────────

function renderResumeEditor() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <ResumeEditor />
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ResumeEditor", () => {
  describe("layout", () => {
    it("renders a two-column layout with ResumeDisplay on the left", () => {
      renderResumeEditor();

      const display = screen.getByTestId("resume-display");
      expect(display).toBeDefined();
      expect(display.textContent).toBe("Resume sections");
    });

    it("renders CoachChatPanel on the right with coachType resume", () => {
      renderResumeEditor();

      const panel = screen.getByTestId("coach-chat-panel");
      expect(panel).toBeDefined();
      expect(screen.getByTestId("coach-type").textContent).toBe("resume");
      expect(screen.getByTestId("force-agent").textContent).toBe("resume");
    });

    it("coach panel shows reference resume prompt, not job description", () => {
      renderResumeEditor();

      const emptyText = screen.getByTestId("empty-state-text").textContent;
      expect(emptyText).toContain("reference resume");
      expect(emptyText).not.toContain("job description");
    });
  });
});
