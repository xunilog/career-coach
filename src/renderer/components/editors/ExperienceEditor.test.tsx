// src/renderer/components/editors/ExperienceEditor.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for ExperienceEditor — two-column layout with experience cards on
// the left and Experience Coach chat on the right. Cards have edit buttons
// that open a structured modal. Includes an "Add Experience" button.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ExperienceEditor } from "./ExperienceEditor";

// ── Mock CoachChatPanel ────────────────────────────────────────────────────

vi.mock("../chat/CoachChatPanel", () => ({
  CoachChatPanel: ({
    coachType,
    emptyStateText,
    placeholder,
  }: {
    coachType: string;
    emptyStateText: string;
    placeholder: string;
  }) => (
    <div data-testid="coach-chat-panel">
      <span data-testid="coach-type">{coachType}</span>
      <span data-testid="empty-state">{emptyStateText}</span>
      <span data-testid="placeholder">{placeholder}</span>
    </div>
  ),
}));

// ── Mock stores ────────────────────────────────────────────────────────────

const mockExperiences: Array<{
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  sector: string;
  raciRoles: string[];
  keyProjects: string[];
  quantifiedAchievements: string[];
  skillsDemonstrated: string[];
  challenges: string;
  rawNotes: string;
}> = [
  {
    id: "exp-1",
    company: "Acme Corp",
    title: "Senior Engineer",
    startDate: "2020-01",
    endDate: "2023-06",
    sector: "Tech",
    raciRoles: ["Responsible"],
    keyProjects: ["Project X"],
    quantifiedAchievements: ["Increased revenue 20%"],
    skillsDemonstrated: ["TypeScript"],
    challenges: "Scaling the team",
    rawNotes: "Great experience",
  },
  {
    id: "exp-2",
    company: "Beta Inc",
    title: "Tech Lead",
    startDate: "2018-03",
    endDate: "present",
    sector: "Finance",
    raciRoles: ["Accountable"],
    keyProjects: ["Platform rebuild"],
    quantifiedAchievements: ["Reduced costs 30%"],
    skillsDemonstrated: ["Leadership", "Go"],
    challenges: "Legacy migration",
    rawNotes: "Learned a lot about distributed systems",
  },
];

const mockStore = {
  experiences: mockExperiences,
  experienceMarkdown: "",
  setExperienceMarkdown: vi.fn(),
  addExperience: vi.fn(),
  updateExperience: vi.fn(),
  removeExperience: vi.fn(),
  messages: [],
  isStreaming: false,
  sendMessage: vi.fn(),
  threadId: "session-exp",
  conversationTitle: "Experience Chat",
  setConversations: vi.fn(),
  loadConversation: vi.fn(),
  startNewConversation: vi.fn(),
};

vi.mock("../../stores/careerStore", () => ({
  useCareerStore: vi.fn((selector?: (state: typeof mockStore) => unknown) => {
    return selector ? selector(mockStore) : mockStore;
  }),
}));

// ── Mock ExperienceEditModal ───────────────────────────────────────────────

vi.mock("./ExperienceEditModal", () => ({
  ExperienceEditModal: ({ opened, onClose }: { opened: boolean; onClose: () => void }) =>
    opened ? (
      <div data-testid="experience-edit-modal">
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
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

  // ResizeObserver for ScrollArea
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

  // Crypto for UUID generation
  Object.defineProperty(window, "crypto", {
    writable: true,
    value: {
      randomUUID: vi.fn(() => "test-uuid-1234"),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderExperienceEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter>
          <ExperienceEditor />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ExperienceEditor", () => {
  describe("two-column layout", () => {
    it("renders experience cards on the left and coach chat on the right", () => {
      renderExperienceEditor();

      // Left column: experience cards should be visible
      expect(screen.getByText("Senior Engineer")).toBeDefined();
      expect(screen.getByText("Acme Corp")).toBeDefined();
      expect(screen.getByText("Tech Lead")).toBeDefined();
      expect(screen.getByText("Beta Inc")).toBeDefined();

      // Right column: CoachChatPanel should be rendered
      const chatPanel = screen.getByTestId("coach-chat-panel");
      expect(chatPanel).toBeDefined();

      // Coach type should be "experience"
      expect(screen.getByTestId("coach-type").textContent).toBe("experience");
    });

    it("renders CoachChatPanel with experience configuration", () => {
      renderExperienceEditor();

      // Verify placeholder text
      expect(screen.getByTestId("placeholder").textContent).toContain("Tell the Experience Coach");

      // Verify empty state text
      expect(screen.getByTestId("empty-state").textContent).toContain("Experience Coach");
    });

    it("shows sector badges for experiences", () => {
      renderExperienceEditor();

      expect(screen.getByText("Tech")).toBeDefined();
      expect(screen.getByText("Finance")).toBeDefined();
    });

    it("renders 'Add Experience' button", () => {
      renderExperienceEditor();

      expect(screen.getByText("Add Experience")).toBeDefined();
    });

    it("shows date ranges for each experience", () => {
      renderExperienceEditor();

      expect(screen.getByText("2020-01 – 2023-06")).toBeDefined();
      expect(screen.getByText("2018-03 – Present")).toBeDefined();
    });
  });

  describe("empty state", () => {
    it("shows placeholder when there are no experiences", () => {
      // Temporarily set experiences to empty for this test
      const saved = mockStore.experiences;
      mockStore.experiences = [];

      renderExperienceEditor();

      expect(screen.getByText(/No experiences yet/)).toBeDefined();
      // "Add Experience" button should still be present even when empty
      expect(screen.getByText("Add Experience")).toBeDefined();
      // No experience cards
      expect(screen.queryByText("Senior Engineer")).toBeNull();

      // Restore
      mockStore.experiences = saved;
    });
  });

  describe("edit buttons", () => {
    it("renders edit buttons for each experience card", () => {
      renderExperienceEditor();

      const editButtons = screen.getAllByLabelText("Edit experience");
      expect(editButtons.length).toBe(2); // one per experience
    });
  });

  describe("legacy removal", () => {
    it("does NOT render a MarkdownEditor or ConversationDropdown", () => {
      renderExperienceEditor();

      expect(screen.queryByTestId("markdown-editor")).toBeNull();
      expect(screen.queryByText(/Editing your work experiences/)).toBeNull();
    });
  });
});
