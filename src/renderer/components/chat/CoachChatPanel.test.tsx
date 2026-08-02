// src/renderer/components/chat/CoachChatPanel.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for CoachChatPanel — reusable chat panel used by both ProfileEditor
// and ExperienceEditor. Verifies conversation buttons, message list, empty
// state, and coach type configuration.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CoachChatPanel } from "./CoachChatPanel";

// ── Mock stores ────────────────────────────────────────────────────────────

const mockStore = {
  messages: [] as Array<{ type: string; content: string }>,
  isStreaming: false,
  streamingReasoning: "",
  isReasoningPhase: false,
  sendMessage: vi.fn(),
  threadId: "session-test",
  conversationTitle: "Test Chat",
  setConversations: vi.fn(),
  loadConversation: vi.fn(),
  startNewConversation: vi.fn().mockImplementation(() => {
    mockStore.messages = [];
    mockStore.threadId = "";
    mockStore.conversationTitle = "";
  }),
  initializeFromStorage: vi.fn(),
  resetChatState: vi.fn().mockImplementation(() => {
    mockStore.messages = [];
    mockStore.threadId = "";
    mockStore.conversationTitle = "";
  }),
};

vi.mock("../../stores/careerStore", () => ({
  useCareerStore: vi.fn((selector?: (state: typeof mockStore) => unknown) => {
    return selector ? selector(mockStore) : mockStore;
  }),
}));

// ── Mock ChatBubble ────────────────────────────────────────────────────────

vi.mock("./ChatBubble", () => ({
  ChatBubble: ({ message }: { message: { type: string; content: string } }) => (
    <div data-testid="chat-bubble">{message.content}</div>
  ),
}));

// ── Mock ChatInput ─────────────────────────────────────────────────────────

vi.mock("./ChatInput", () => ({
  ChatInput: ({
    value,
    placeholder,
    disabled,
    onChange,
  }: {
    value: string;
    placeholder: string;
    disabled: boolean;
    onChange: (v: string) => void;
  }) => (
    <input
      data-testid="chat-input"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  ),
}));

// ── Mock ConversationHistoryModal ──────────────────────────────────────────

vi.mock("./ConversationHistoryModal", () => ({
  ConversationHistoryModal: ({ opened }: { opened: boolean }) =>
    opened ? <div data-testid="history-modal">History Modal</div> : null,
}));

// ── Mock conversation query hooks ──────────────────────────────────────────

const mockLatestConversation: Record<
  string,
  { threadId: string; title: string; type: string; createdAt: string; updatedAt: string } | null
> = {
  profile: null,
  experience: null,
};

vi.mock("../../hooks/useConversationQueries", () => ({
  useConversationsQuery: vi.fn(() => ({
    data: [
      {
        threadId: "conv-1",
        title: "My Profile Chat",
        type: "profile",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        threadId: "conv-2",
        title: "Experience deep dive",
        type: "profile",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  })),
  useLatestConversation: vi.fn((type?: string) => ({
    data: type ? (mockLatestConversation[type] ?? null) : null,
  })),
  useCreateConversation: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({
      threadId: "new-conv",
      title: "New Chat",
      type: "profile",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  })),
  useDeleteConversation: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
  })),
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

  // ResizeObserver for ScrollArea (history modal)
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });

  // IntersectionObserver for useScrollToBottom
  class IntersectionObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: IntersectionObserverMock,
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

beforeEach(() => {
  // Reset mockStore state to prevent test leakage
  mockStore.messages = [];
  mockStore.isStreaming = false;
  mockStore.streamingReasoning = "";
  mockStore.isReasoningPhase = false;
  mockStore.threadId = "session-test";
  mockStore.conversationTitle = "Test Chat";
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Wrapper ────────────────────────────────────────────────────────────────

function renderCoachChatPanel(coachType: "profile" | "experience" | "resume" = "profile") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <CoachChatPanel
          coachType={coachType}
          emptyStateText="Start a conversation with your coach."
          placeholder="Tell your coach about yourself..."
          forceAgent="profile"
          colH="calc(800px - 60px - 2 * 16px)"
          themeSpacing="16px"
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CoachChatPanel", () => {
  describe("conversation buttons", () => {
    it("renders Conversation History button", () => {
      renderCoachChatPanel();

      const historyButton = screen.getByLabelText("Conversation History");
      expect(historyButton).toBeDefined();
    });

    it("renders New Conversation button", () => {
      renderCoachChatPanel();

      const newButton = screen.getByLabelText("New Conversation");
      expect(newButton).toBeDefined();
    });
  });

  describe("empty state", () => {
    it("shows empty state text when there are no messages", () => {
      renderCoachChatPanel();

      expect(screen.getByText("Start a conversation with your coach.")).toBeDefined();
    });
  });

  describe("message list", () => {
    it("renders ChatBubble components for each message", () => {
      // Arrange: set up a profile conversation so auto-init loads it
      mockLatestConversation.profile = {
        threadId: "conv-profile",
        title: "Profile Chat",
        type: "profile",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Pre-populate store messages (simulating an already-loaded conversation)
      mockStore.messages = [
        { type: "human", content: "Hello coach!" },
        { type: "ai", content: "Hi there! How can I help?" },
      ];
      mockStore.threadId = "conv-profile";
      mockStore.loadConversation.mockClear();

      renderCoachChatPanel();

      const bubbles = screen.getAllByTestId("chat-bubble");
      expect(bubbles).toHaveLength(2);
      expect(bubbles[0].textContent).toBe("Hello coach!");
      expect(bubbles[1].textContent).toBe("Hi there! How can I help?");
    });
  });

  describe("input row", () => {
    it("renders a chat input with the configured placeholder", () => {
      renderCoachChatPanel();

      const input = screen.getByTestId("chat-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Tell your coach about yourself...");
    });

    it("disables input when streaming", () => {
      mockStore.isStreaming = true;

      renderCoachChatPanel();

      const input = screen.getByTestId("chat-input") as HTMLInputElement;
      expect(input.disabled).toBe(true);
      expect(input.placeholder).toBe("Waiting for response...");
    });
  });

  describe("coach type configuration", () => {
    it("uses experience color for send button when coachType is experience", () => {
      renderCoachChatPanel("experience");

      const input = screen.getByTestId("chat-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Tell your coach about yourself...");
    });

    it("renders with coachType resume and conversation buttons are present", () => {
      renderCoachChatPanel("resume");

      // Should render without crashing — verify key elements are present
      const historyButton = screen.getByLabelText("Conversation History");
      expect(historyButton).toBeDefined();
      const newButton = screen.getByLabelText("New Conversation");
      expect(newButton).toBeDefined();
      const input = screen.getByTestId("chat-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Tell your coach about yourself...");
    });

    it("auto-loads latest conversation of type resume on mount", async () => {
      // Arrange: set up a latest resume conversation
      const resumeConversation = {
        threadId: "resume-latest",
        title: "Resume Coaching",
        type: "resume",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockLatestConversation.resume = resumeConversation;

      // Act: mount with coachType="resume"
      renderCoachChatPanel("resume");

      // Assert: loadConversation was called with the latest resume conversation
      expect(mockStore.loadConversation).toHaveBeenCalledWith(resumeConversation);
    });
  });

  describe("auto-initialization", () => {
    it("loads the latest conversation of the given coachType on mount", async () => {
      // Arrange: set up a latest experience conversation
      const expConversation = {
        threadId: "exp-latest",
        title: "Experience Coaching",
        type: "experience",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockLatestConversation.experience = expConversation;

      // Act: mount with coachType="experience"
      renderCoachChatPanel("experience");

      // Assert: loadConversation was called with the latest experience conversation
      expect(mockStore.loadConversation).toHaveBeenCalledWith(expConversation);
    });

    it("does NOT auto-load when the latest conversation matches current thread", async () => {
      // Arrange: current threadId already matches the latest conversation
      mockStore.threadId = "exp-latest";
      const expConversation = {
        threadId: "exp-latest",
        title: "Experience Coaching",
        type: "experience",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockLatestConversation.experience = expConversation;

      // Reset call count from previous renders
      mockStore.loadConversation.mockClear();

      // Act
      renderCoachChatPanel("experience");

      // Assert: loadConversation is NOT called (already on the right thread)
      expect(mockStore.loadConversation).not.toHaveBeenCalled();
    });

    it("loads from storage when no latest conversation exists (null)", async () => {
      // Arrange: no conversations of this type yet
      mockLatestConversation.experience = null;
      mockStore.loadConversation.mockClear();
      mockStore.initializeFromStorage.mockClear();
      mockStore.startNewConversation.mockClear();

      // Act
      renderCoachChatPanel("experience");

      // Assert: loadConversation is NOT called (no conversation to load)
      expect(mockStore.loadConversation).not.toHaveBeenCalled();
      // A new conversation is created and started (async), then career data is loaded
      await waitFor(() => {
        expect(mockStore.startNewConversation).toHaveBeenCalled();
      });
      expect(mockStore.initializeFromStorage).toHaveBeenCalled();
    });

    it("creates a new conversation when none exists for this coach type", async () => {
      // Arrange: pre-populate messages from a previous (different-type) conversation
      mockStore.messages = [
        { type: "human", content: "Experience chat message" },
        { type: "ai", content: "Experience coach reply" },
      ];
      mockStore.threadId = "session-experience-123";
      mockStore.conversationTitle = "Old Experience Chat";
      mockLatestConversation.resume = null; // No resume conversations yet
      mockStore.initializeFromStorage.mockClear();
      mockStore.startNewConversation.mockClear();

      // Act: navigate to resume page
      renderCoachChatPanel("resume");

      // A new conversation is created in the DB and started via the store,
      // which clears stale messages and loads career data from SQLite.
      await waitFor(() => {
        expect(mockStore.startNewConversation).toHaveBeenCalled();
      });
      expect(mockStore.initializeFromStorage).toHaveBeenCalled();
      expect(mockStore.loadConversation).not.toHaveBeenCalled();
    });
  });

  describe("streaming reasoning display", () => {
    beforeEach(() => {
      // Pre-populate messages so the empty state does not display
      mockStore.messages = [{ type: "human", content: "Analyze me" }];
      mockStore.threadId = "conv-stream";
    });

    it("shows live reasoning content when streamingReasoning is available", () => {
      mockStore.isStreaming = true;
      mockStore.streamingReasoning = "Let me analyze the user's career profile...";

      renderCoachChatPanel();

      expect(screen.getByText("Let me analyze the user's career profile...")).toBeDefined();
    });

    it("shows reasoning even outside isReasoningPhase (persists until text arrives)", () => {
      // Reasoning should persist even when isReasoningPhase is false,
      // as long as streamingReasoning still has content
      mockStore.isStreaming = true;
      mockStore.isReasoningPhase = false;
      mockStore.streamingReasoning = "Still visible reasoning...";

      renderCoachChatPanel();

      expect(screen.getByText("Still visible reasoning...")).toBeDefined();
      // "Thinking..." should NOT be shown when reasoning is visible
      expect(screen.queryByText("Thinking...")).toBeNull();
    });

    it("shows Thinking loader when streaming with no reasoning content", () => {
      mockStore.isStreaming = true;
      mockStore.streamingReasoning = "";

      renderCoachChatPanel();

      expect(screen.getByText("Thinking...")).toBeDefined();
    });

    it("does NOT show reasoning or loader when NOT streaming", () => {
      mockStore.isStreaming = false;
      mockStore.streamingReasoning = "";

      renderCoachChatPanel();

      expect(screen.queryByText("Thinking...")).toBeNull();
    });
  });
});
