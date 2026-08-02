// src/renderer/stores/careerStore.test.ts
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for careerStore — verifies that chat thread switching does NOT
// clear global career data (profile, experiences, targetJob, resumeDraft).
// Bug: Chat thread should be independent from other store properties.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCareerStore, generateConversationTitle } from "./careerStore";
import type { Experience } from "../../shared/state";

// ── Module mocks (hoisted by vitest) ──────────────────────────────────
const { mockGetTuple, mockPut, mockDb } = vi.hoisted(() => ({
  mockGetTuple: vi.fn().mockResolvedValue(undefined),
  mockPut: vi.fn().mockResolvedValue({}),
  mockDb: {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
  },
}));

vi.mock("../../services/database", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
  closeDb: vi.fn(),
}));

vi.mock("../../services/career-data-service", () => ({
  getProfile: vi.fn().mockResolvedValue(null),
  getExperiences: vi.fn().mockResolvedValue([]),
  getResumeDraft: vi.fn().mockResolvedValue(null),
  saveProfile: vi.fn(),
  saveExperiences: vi.fn(),
  saveResumeDraft: vi.fn(),
}));

vi.mock("../../services/sql-checkpointer", () => ({
  SqlCheckpointer: vi.fn(function (this: any) {
    this.getTuple = mockGetTuple;
    this.put = mockPut;
  }),
}));

vi.mock("../../services/conversation-service", async () => {
  const actual = await vi.importActual("../../services/conversation-service");
  return {
    ...actual,
    updateConversationTitleAuto: vi.fn().mockResolvedValue(undefined),
    touchConversationAuto: vi.fn().mockResolvedValue(undefined),
  };
});

const { mockModelInvoke, mockModelStream } = vi.hoisted(() => ({
  mockModelInvoke: vi.fn().mockResolvedValue({ content: "Hello! Let's explore your profile." }),
  mockModelStream: vi.fn(),
}));

vi.mock("../../shared/llm-provider", () => ({
  getModel: vi.fn(() => ({
    invoke: mockModelInvoke,
    stream: mockModelStream,
  })),
}));

// ── Agent mocks (hoisted) ──────────────────────────────────────────────
const { mockProfileAgentInvoke, mockProfileAgentStream, mockSeedProfile, mockGetProfile } =
  vi.hoisted(() => ({
    mockProfileAgentInvoke: vi.fn(),
    mockProfileAgentStream: vi.fn(),
    mockSeedProfile: vi.fn(),
    mockGetProfile: vi.fn().mockReturnValue({}),
  }));

const {
  mockExperienceAgentInvoke,
  mockExperienceAgentStream,
  mockSeedExperiences,
  mockGetExperiences,
} = vi.hoisted(() => ({
  mockExperienceAgentInvoke: vi.fn(),
  mockExperienceAgentStream: vi.fn(),
  mockSeedExperiences: vi.fn(),
  mockGetExperiences: vi.fn().mockReturnValue([]),
}));

const { mockResumeAgentStream, mockSeedResume, mockGetResume } = vi.hoisted(() => ({
  mockResumeAgentStream: vi.fn(),
  mockSeedResume: vi.fn(),
  mockGetResume: vi.fn().mockReturnValue({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    linkedin: "",
    otherNetworks: "",
    nationality: "",
    country: "",
    title: "",
    bannerHighlights: "",
    keySkills: [],
    education: [],
    languages: [],
  }),
}));

vi.mock("../../shared/agents/profileChatAgent", () => ({
  createProfileChatAgent: vi.fn(() => ({
    agent: { invoke: mockProfileAgentInvoke, stream: mockProfileAgentStream },
    seedProfile: mockSeedProfile,
    getProfile: mockGetProfile,
    setConversationMessages: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("../../shared/agents/experienceChatAgent", () => ({
  createExperienceChatAgent: vi.fn(() => ({
    agent: { invoke: mockExperienceAgentInvoke, stream: mockExperienceAgentStream },
    seedExperiences: mockSeedExperiences,
    getExperiences: mockGetExperiences,
    setConversationMessages: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("../../shared/agents/resumeChatAgent", () => ({
  createResumeChatAgent: vi.fn(() => ({
    agent: { stream: mockResumeAgentStream },
    seedResume: mockSeedResume,
    getResume: mockGetResume,
    setConversationMessages: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Helper to reset the Zustand store between tests
const emptyResume = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  linkedin: "",
  otherNetworks: "",
  nationality: "",
  country: "",
  title: "",
  bannerHighlights: "",
  keySkills: [],
  education: [],
  languages: [],
};

function resetStore() {
  useCareerStore.setState({
    profileMarkdown: "",
    experienceMarkdown: "",
    resumeMarkdown: "",
    profile: {},
    experiences: [],
    targetJob: "",
    resumeDraft: "",
    resumeData: { ...emptyResume },
    messages: [],
    activeAgent: "router",
    isStreaming: false,
    threadId: "session-test",
    conversationTitle: "Test Chat",
    availableConversations: [],
    streamingReasoning: "",
    isReasoningPhase: false,
  });
}

describe("careerStore — chat thread independence", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("startNewConversation", () => {
    it("preserves global career data when starting a new chat", () => {
      // Arrange
      const existingProfile = {
        dominantColor: "Blue" as const,
        careerDrivers: ["impact", "autonomy"],
        workStylePreferences: ["collaborative"],
        values: ["integrity"],
        riskAppetite: "medium" as const,
        riskProfileDetails: "Willing to take calculated risks in tech startups.",
        changeToleranceNotes: "Comfortable with ambiguity.",
      };
      const existingExperiences = [
        {
          id: "exp-1",
          company: "Acme Corp",
          title: "Senior Engineer",
          startDate: "2020-01",
          endDate: "2023-06",
          sector: "Tech",
          raciRoles: ["Responsible" as const],
          keyProjects: ["Project X"],
          quantifiedAchievements: ["Increased revenue 20%"],
          skillsDemonstrated: [{ name: "TypeScript", category: "technical" as const }],
          challenges: "Scaling the team",
          rawNotes: "Great experience",
        },
      ];

      useCareerStore.setState({
        profile: existingProfile,
        profileMarkdown: "# Career Profile\n...",
        experiences: existingExperiences,
        experienceMarkdown: "# Experience\n...",
        targetJob: "Staff Engineer",
        resumeDraft: "# Resume Draft\n...",
        resumeMarkdown: "# Resume\n...",
        messages: [
          { type: "human", content: "Hello coach" },
          { type: "ai", content: "Hi! Let's work on your profile." },
        ],
        activeAgent: "profile" as const,
        threadId: "session-old-chat",
        conversationTitle: "Profile discovery chat",
      });

      // Act: start a new conversation (simulating "New Chat" button click)
      const newConversation = {
        threadId: "session-new-chat",
        title: "New Chat",
        type: "general",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useCareerStore.getState().startNewConversation(newConversation);

      // Assert: thread-specific state is reset
      const state = useCareerStore.getState();
      expect(state.threadId).toBe("session-new-chat");
      expect(state.conversationTitle).toBe("New Chat");
      expect(state.messages).toEqual([]);
      expect(state.activeAgent).toBe("router");

      // Assert: global career data is PRESERVED
      expect(state.profile).toEqual(existingProfile);
      expect(state.profileMarkdown).toBe("# Career Profile\n...");
      expect(state.experiences).toEqual(existingExperiences);
      expect(state.experienceMarkdown).toBe("# Experience\n...");
      expect(state.targetJob).toBe("Staff Engineer");
      expect(state.resumeDraft).toBe("# Resume Draft\n...");
      expect(state.resumeMarkdown).toBe("# Resume\n...");
    });
  });

  describe("mergeStreamResult", () => {
    it("does NOT overwrite existing profile data with sentinel/empty values from a new thread", () => {
      // Arrange: Simulate a user who built profile in Chat A,
      // switched to Chat B (startNewConversation preserves profile),
      // and now sends their first message in Chat B.
      // The agent on the new thread starts fresh and returns sentinel values.
      const existingProfile = {
        dominantColor: "Blue" as const,
        secondaryColor: "Green" as const,
        careerDrivers: ["impact", "autonomy"],
        workStylePreferences: ["collaborative"],
        values: ["integrity"],
        riskAppetite: "medium" as const,
        riskProfileDetails: "Calculated risks in tech.",
        changeToleranceNotes: "Comfortable with ambiguity.",
      };
      const existingExperiences = [
        {
          id: "exp-1",
          company: "Acme Corp",
          title: "Senior Engineer",
          startDate: "2020-01",
          endDate: "2023-06",
          sector: "Tech",
          raciRoles: ["Responsible" as const],
          keyProjects: ["Project X"],
          quantifiedAchievements: ["Increased revenue 20%"],
          skillsDemonstrated: [{ name: "TypeScript", category: "technical" as const }],
          challenges: "Scaling the team",
          rawNotes: "Great experience",
        },
      ];

      useCareerStore.setState({
        profile: existingProfile,
        profileMarkdown: "# Career Profile\n## Colors Profile\n- **Dominant Color:** 🔵 Blue",
        experiences: existingExperiences,
        experienceMarkdown: "# Experience\n...",
        targetJob: "Staff Engineer",
        resumeDraft: "# Resume Draft\n...",
        resumeMarkdown: "# Resume\n...",
        messages: [{ type: "human", content: "Hi, I want to look for jobs" }],
        activeAgent: "router",
        threadId: "session-new-chat",
        conversationTitle: "New Chat",
      });

      // Act: mergeStreamResult with sentinel/empty profile from the new thread's agent
      // This simulates what happens when the router agent or profile agent
      // responds on a thread that has no profile built yet.
      useCareerStore.getState().mergeStreamResult({
        activeAgent: "profile",
        profile: {
          dominantColor: "unknown",
          careerDrivers: [],
          workStylePreferences: [],
          values: [],
          riskAppetite: "unknown",
          riskProfileDetails: "",
          changeToleranceNotes: "",
          rawInsights: "",
        },
        experiences: [],
        targetJob: "",
        resumeDraft: "",
        messages: [
          {
            type: "ai",
            content: "Hi! I see we haven't started your profile yet. Tell me about yourself!",
          },
        ],
      });

      // Assert: existing profile data should NOT be clobbered by sentinel values
      const state = useCareerStore.getState();

      // Real data that existed before should survive
      expect(state.profile.dominantColor).toBe("Blue");
      expect(state.profile.secondaryColor).toBe("Green");
      expect(state.profile.careerDrivers).toEqual(["impact", "autonomy"]);
      expect(state.profile.workStylePreferences).toEqual(["collaborative"]);
      expect(state.profile.values).toEqual(["integrity"]);
      expect(state.profile.riskAppetite).toBe("medium");
      expect(state.profile.riskProfileDetails).toBe("Calculated risks in tech.");
      expect(state.profile.changeToleranceNotes).toBe("Comfortable with ambiguity.");

      // Profile markdown should be preserved (not cleared to empty string)
      expect(state.profileMarkdown).toContain("Blue");
      expect(state.profileMarkdown).not.toBe("");

      // Other global data should be preserved
      expect(state.experiences).toEqual(existingExperiences);
      expect(state.targetJob).toBe("Staff Engineer");
      expect(state.resumeDraft).toBe("# Resume Draft\n...");
    });
  });

  describe("loadConversation", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      resetStore();
    });

    it("restores messages from langgraph checkpoints when available", async () => {
      const savedMessages = [
        { type: "human", content: "Help me with my resume" },
        { type: "ai", content: "Sure! Let's work on your resume." },
      ];

      // Configure the checkpoint mock to return saved messages
      mockGetTuple.mockResolvedValue({
        config: { configurable: { thread_id: "conv-1" } },
        checkpoint: { channel_values: { messages: savedMessages } },
        metadata: { source: "input", step: 2, parents: {} },
      } as any);

      const conversation = {
        threadId: "conv-1",
        title: "Resume help",
        type: "profile",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      };
      await useCareerStore.getState().loadConversation(conversation);

      const state = useCareerStore.getState();
      expect(state.threadId).toBe("conv-1");
      expect(state.conversationTitle).toBe("Resume help");
      expect(state.activeAgent).toBe("router");
      expect(state.messages).toEqual(savedMessages);
    });

    it("preserves existing career data when switching conversations", async () => {
      // Existing career data in store (from a previous chat)
      const existingProfile = {
        dominantColor: "Blue" as const,
        secondaryColor: "Green" as const,
        careerDrivers: ["impact", "growth"],
      };
      const existingExperiences: Experience[] = [
        {
          id: "exp-1",
          company: "Acme Corp",
          title: "Senior Engineer",
          startDate: "2020-01",
          endDate: "2023-06",
          sector: "Tech",
          raciRoles: ["Responsible" as const],
          keyProjects: ["Project X"],
          quantifiedAchievements: ["Increased revenue 20%"],
          skillsDemonstrated: [{ name: "TypeScript", category: "technical" as const }],
          challenges: "Scaling the team",
          rawNotes: "Great experience",
        },
      ];

      useCareerStore.setState({
        profile: existingProfile,
        profileMarkdown: "# Profile\nBlue",
        experiences: existingExperiences,
        experienceMarkdown: "# Experience\n...",
        targetJob: "Staff Engineer",
        resumeDraft: "# Resume Draft\n...",
        messages: [
          { type: "human", content: "Old chat" },
          { type: "ai", content: "Old response" },
        ],
        activeAgent: "profile",
        threadId: "old-thread",
        conversationTitle: "Old Chat",
      });

      // SQLite returns no new career data — simulating a conversation
      // that has messages but no profile/experiences in its checkpoint
      // (getProfile, getExperiences, getResumeDraft already default to null/[])

      const conversation = {
        threadId: "new-thread",
        title: "New Chat",
        type: "profile",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      };
      await useCareerStore.getState().loadConversation(conversation);

      const state = useCareerStore.getState();
      // Thread-specific state is updated
      expect(state.threadId).toBe("new-thread");
      expect(state.conversationTitle).toBe("New Chat");
      // Career data is preserved (mergeProfile keeps existing values
      // when incoming data is empty)
      expect(state.profile.dominantColor).toBe("Blue");
      expect(state.profile.secondaryColor).toBe("Green");
      expect(state.profile.careerDrivers).toEqual(["impact", "growth"]);
      expect(state.experiences).toEqual(existingExperiences);
      expect(state.targetJob).toBe("Staff Engineer");
      expect(state.resumeDraft).toBe("# Resume Draft\n...");
    });

    it("loads career data from SQLite and falls back to empty messages when no checkpoint exists", async () => {
      const { getProfile, getExperiences, getResumeDraft } =
        await import("../../services/career-data-service");

      const sqliteProfile = {
        dominantColor: "Yellow" as const,
        careerDrivers: ["recognition", "security"],
        riskAppetite: "high" as const,
        riskProfileDetails: "Happy to bet on myself.",
        changeToleranceNotes: "Thrives in chaos.",
      };
      const sqliteExperiences: Experience[] = [
        {
          id: "exp-sqlite",
          company: "Startup X",
          title: "CTO",
          startDate: "2018-03",
          endDate: "2024-01",
          sector: "Fintech",
          raciRoles: ["Accountable" as const],
          keyProjects: ["Platform rewrite"],
          quantifiedAchievements: ["10x growth"],
          skillsDemonstrated: [{ name: "Leadership", category: "soft" as const }],
          challenges: "Funding winter",
          rawNotes: "Built from scratch",
        },
      ];

      // SQLite has career data — mock the return types correctly
      vi.mocked(getProfile).mockResolvedValue(sqliteProfile as any);
      vi.mocked(getExperiences).mockResolvedValue(sqliteExperiences);
      vi.mocked(getResumeDraft).mockResolvedValue({
        firstName: "John",
        lastName: "Doe",
        phone: "",
        email: "john@example.com",
        linkedin: "",
        otherNetworks: "",
        nationality: "",
        country: "",
        title: "CTO",
        bannerHighlights: "Experienced CTO...",
        keySkills: [{ name: "Leadership", category: "soft" as const }],
        education: [],
        languages: [],
      });

      // No checkpoint exists yet
      mockGetTuple.mockResolvedValue(undefined);

      const conversation = {
        threadId: "conv-sqlite",
        title: "Job search",
        type: "profile",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      };
      await useCareerStore.getState().loadConversation(conversation);

      const state = useCareerStore.getState();
      expect(state.threadId).toBe("conv-sqlite");
      expect(state.messages).toEqual([]);
      // Career data loaded from SQLite
      expect(state.profile.dominantColor).toBe("Yellow");
      expect(state.profile.careerDrivers).toEqual(["recognition", "security"]);
      expect(state.profile.riskAppetite).toBe("high");
      expect(state.profileMarkdown).toContain("Yellow");
      expect(state.experiences).toEqual(sqliteExperiences);
      expect(state.resumeData.title).toBe("CTO");
      expect(state.resumeData.bannerHighlights).toBe("Experienced CTO...");
      expect(state.resumeDraft).toContain("CTO");
    });
  });
});

describe("generateConversationTitle", () => {
  it("uses the first ~60 chars of the message as title", () => {
    const title = generateConversationTitle("Help me improve my resume for a tech lead position");
    expect(title).toBe("Help me improve my resume for a tech lead position");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("truncates long messages at 60 characters", () => {
    const title = generateConversationTitle(
      "I need comprehensive help with my career transition from engineering to product management role",
    );
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toBe("I need comprehensive help with my career transition from eng");
  });

  it("replaces newlines with spaces", () => {
    const title = generateConversationTitle("Help me\nwith my\nresume please");
    expect(title).toBe("Help me with my resume please");
    expect(title).not.toContain("\n");
  });

  it("trim whitespace", () => {
    const title = generateConversationTitle("   Update my profile   ");
    expect(title).toBe("Update my profile");
  });

  it("falls back to 'New Chat' for empty message", () => {
    const title = generateConversationTitle("");
    expect(title).toBe("New Chat");
  });

  it("falls back to 'New Chat' for whitespace-only message", () => {
    const title = generateConversationTitle("   \n  \t  ");
    expect(title).toBe("New Chat");
  });
});

describe("careerStore — experience CRUD actions", () => {
  beforeEach(() => {
    resetStore();
  });

  const makeExperience = (overrides: Partial<Experience> = {}): Experience => ({
    id: "exp-1",
    company: "Acme Corp",
    title: "Senior Engineer",
    startDate: "2020-01",
    endDate: "2023-06",
    sector: "Tech",
    raciRoles: ["Responsible" as const],
    keyProjects: ["Project X"],
    quantifiedAchievements: ["Increased revenue 20%"],
    skillsDemonstrated: [{ name: "TypeScript", category: "technical" as const }],
    challenges: "Scaling the team",
    rawNotes: "Great experience",
    ...overrides,
  });

  describe("addExperience", () => {
    it("appends an experience to an empty array", () => {
      const exp = makeExperience();
      useCareerStore.getState().addExperience(exp);

      const state = useCareerStore.getState();
      expect(state.experiences).toHaveLength(1);
      expect(state.experiences[0]).toEqual(exp);
    });

    it("appends an experience to an existing array", () => {
      const existing = makeExperience({ id: "exp-existing", company: "Old Co" });
      useCareerStore.setState({ experiences: [existing] });

      const newExp = makeExperience({ id: "exp-new", company: "New Co" });
      useCareerStore.getState().addExperience(newExp);

      const state = useCareerStore.getState();
      expect(state.experiences).toHaveLength(2);
      expect(state.experiences[0]).toEqual(existing);
      expect(state.experiences[1]).toEqual(newExp);
    });
  });

  describe("updateExperience", () => {
    it("merges partial fields into the matching experience", () => {
      const existing = makeExperience({ id: "exp-1", company: "Acme Corp", title: "Engineer" });
      useCareerStore.setState({ experiences: [existing] });

      useCareerStore.getState().updateExperience("exp-1", {
        title: "Senior Engineer",
        sector: "Fintech",
      });

      const state = useCareerStore.getState();
      expect(state.experiences).toHaveLength(1);
      expect(state.experiences[0].title).toBe("Senior Engineer");
      expect(state.experiences[0].sector).toBe("Fintech");
      expect(state.experiences[0].company).toBe("Acme Corp"); // unchanged
    });

    it("does nothing when no experience matches the id", () => {
      const existing = makeExperience({ id: "exp-1" });
      useCareerStore.setState({ experiences: [existing] });

      useCareerStore.getState().updateExperience("nonexistent", { title: "Ghost" });

      const state = useCareerStore.getState();
      expect(state.experiences).toHaveLength(1);
      expect(state.experiences[0].title).toBe(existing.title);
    });
  });

  describe("removeExperience", () => {
    it("removes the experience by id", () => {
      const exp1 = makeExperience({ id: "exp-1", company: "First" });
      const exp2 = makeExperience({ id: "exp-2", company: "Second" });
      useCareerStore.setState({ experiences: [exp1, exp2] });

      useCareerStore.getState().removeExperience("exp-1");

      const state = useCareerStore.getState();
      expect(state.experiences).toHaveLength(1);
      expect(state.experiences[0].id).toBe("exp-2");
    });

    it("does nothing when no experience matches the id", () => {
      const exp1 = makeExperience({ id: "exp-1" });
      useCareerStore.setState({ experiences: [exp1] });

      useCareerStore.getState().removeExperience("nonexistent");

      expect(useCareerStore.getState().experiences).toHaveLength(1);
    });
  });

  describe("chaining", () => {
    it("add → update → remove maintains correct state through the chain", () => {
      const exp = makeExperience({ id: "exp-1", company: "Acme", title: "Engineer" });
      useCareerStore.getState().addExperience(exp);

      expect(useCareerStore.getState().experiences).toHaveLength(1);
      expect(useCareerStore.getState().experiences[0].company).toBe("Acme");

      useCareerStore.getState().updateExperience("exp-1", { title: "Senior Engineer" });

      expect(useCareerStore.getState().experiences[0].title).toBe("Senior Engineer");

      useCareerStore.getState().removeExperience("exp-1");

      expect(useCareerStore.getState().experiences).toHaveLength(0);
    });
  });
});

describe("careerStore — sendMessage", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("does NOT instruct the LLM to refuse saving profile data", async () => {
    // Arrange: mock model.invoke to capture the system prompt
    let capturedSystemPrompt = "";
    mockModelInvoke.mockImplementationOnce((messages: Array<{ content: string }>) => {
      const systemMsg = messages.find(
        (m) => m.constructor?.name === "SystemMessage" || (m as any)._getType?.() === "system",
      );
      if (systemMsg) {
        capturedSystemPrompt = String(systemMsg.content);
      }
      return Promise.resolve({ content: "I'd be happy to save your profile!" });
    });

    // Act: send a message with the profile agent
    await useCareerStore.getState().sendMessage("Please save my profile", "profile");

    // Assert: the system prompt should NOT tell the LLM to refuse saves
    expect(capturedSystemPrompt).not.toContain("not built yet");
    expect(capturedSystemPrompt).not.toContain("implemented soon");
    expect(capturedSystemPrompt).not.toContain("functionality not built");
    expect(capturedSystemPrompt).not.toContain(
      "remind them the structured save will be implemented",
    );
  });

  it("does NOT instruct the LLM to refuse saving experience data", async () => {
    let capturedSystemPrompt = "";
    mockModelInvoke.mockImplementationOnce((messages: Array<{ content: string }>) => {
      const systemMsg = messages.find(
        (m) => m.constructor?.name === "SystemMessage" || (m as any)._getType?.() === "system",
      );
      if (systemMsg) {
        capturedSystemPrompt = String(systemMsg.content);
      }
      return Promise.resolve({ content: "Your experience has been saved!" });
    });

    await useCareerStore.getState().sendMessage("Save my experience", "experience");

    expect(capturedSystemPrompt).not.toContain("not built yet");
    expect(capturedSystemPrompt).not.toContain("implemented soon");
  });

  it("uses dedicated resumeChatAgent (not router) for resume conversations", async () => {
    const { createResumeChatAgent } = await import("../../shared/agents/resumeChatAgent");

    async function* mockStream() {
      yield [{ type: "ai", content: "Let me help with your resume." }, {}];
    }
    mockResumeAgentStream.mockImplementation(() => mockStream());

    await useCareerStore.getState().sendMessage("Update my resume", "resume");

    // Should use the dedicated resume agent (not the router model fallback)
    expect(createResumeChatAgent).toHaveBeenCalled();
  });

  it("uses profileChatAgent for profile conversations and persists extracted profile", async () => {
    const { createProfileChatAgent } = await import("../../shared/agents/profileChatAgent");
    const { saveProfile } = await import("../../services/career-data-service");

    // Agent returns messages via stream (only AI text, no tool messages shown to user)
    async function* mockStream() {
      yield [{ type: "system", content: "system prompt" }, {}];
      yield [{ type: "human", content: "Please save my profile" }, {}];
      yield [
        { type: "ai", content: "", tool_calls: [{ name: "read_state", args: {}, id: "tc1" }] },
        {},
      ];
      yield [{ type: "tool", content: '{"dominantColor":"unknown"}', tool_call_id: "tc1" }, {}];
      yield [
        { type: "ai", content: "", tool_calls: [{ name: "write_state", args: {}, id: "tc2" }] },
        {},
      ];
      yield [{ type: "tool", content: '{"dominantColor":"Blue"}', tool_call_id: "tc2" }, {}];
      yield [{ type: "ai", content: "I've saved your profile! Your dominant color is Blue." }, {}];
    }
    mockProfileAgentStream.mockResolvedValue(mockStream());

    // After invocation, getProfile returns the accumulated data
    mockGetProfile.mockReturnValue({
      dominantColor: "Blue",
      careerDrivers: ["impact"],
      riskAppetite: "medium",
    });

    mockModelInvoke.mockResolvedValue({ content: "should not be called" });

    await useCareerStore.getState().sendMessage("Please save my profile", "profile");

    // Agent factory was called
    expect(createProfileChatAgent).toHaveBeenCalled();

    // Agent was seeded with current profile state
    expect(mockSeedProfile).toHaveBeenCalled();

    // Agent was invoked via stream with messages
    expect(mockProfileAgentStream).toHaveBeenCalled();

    // Extracted profile was persisted to SQLite
    expect(saveProfile).toHaveBeenCalled();

    // Display messages should NOT include tool messages
    const state = useCareerStore.getState();
    const displayMessages = state.messages;
    expect(displayMessages.some((m) => m.type === "tool")).toBe(false);
    // Should include the final AI text response
    expect(displayMessages.some((m) => m.content.includes("saved your profile"))).toBe(true);
  });

  it("uses experienceChatAgent for experience conversations and persists extracted experiences", async () => {
    const { createExperienceChatAgent } = await import("../../shared/agents/experienceChatAgent");
    const { saveExperiences } = await import("../../services/career-data-service");

    async function* mockStream() {
      yield [{ type: "human", content: "Add my experience at Acme" }, {}];
      yield [
        { type: "ai", content: "", tool_calls: [{ name: "write_state", args: {}, id: "tc1" }] },
        {},
      ];
      yield [{ type: "tool", content: "[{...}]", tool_call_id: "tc1" }, {}];
      yield [{ type: "ai", content: "Experience saved!" }, {}];
    }
    mockExperienceAgentStream.mockImplementation(() => mockStream());

    mockGetExperiences.mockReturnValue([
      {
        id: "exp-1",
        company: "Acme Corp",
        title: "Engineer",
        startDate: "2020-01",
        endDate: "2023-06",
        sector: "Tech",
        raciRoles: [],
        keyProjects: [],
        quantifiedAchievements: [],
        skillsDemonstrated: [],
        challenges: "",
        rawNotes: "",
      },
    ]);

    mockModelInvoke.mockResolvedValue({ content: "should not be called" });

    await useCareerStore.getState().sendMessage("Add my experience at Acme", "experience");

    expect(createExperienceChatAgent).toHaveBeenCalled();
    expect(mockSeedExperiences).toHaveBeenCalled();
    expect(mockExperienceAgentStream).toHaveBeenCalled();
    expect(saveExperiences).toHaveBeenCalled();

    const state = useCareerStore.getState();
    expect(state.messages.some((m) => m.type === "tool")).toBe(false);
    expect(state.messages.some((m) => m.content.includes("Experience saved"))).toBe(true);
  });

  it("uses resumeChatAgent for resume conversations", async () => {
    const { createResumeChatAgent } = await import("../../shared/agents/resumeChatAgent");

    async function* mockStream() {
      yield [{ type: "human", content: "Help with my resume" }, {}];
      yield [
        { type: "ai", content: "", tool_calls: [{ name: "read_state", args: {}, id: "tc1" }] },
        {},
      ];
      yield [{ type: "tool", content: "{}", tool_call_id: "tc1" }, {}];
      yield [{ type: "ai", content: "Let me help you build your reference resume." }, {}];
    }
    mockResumeAgentStream.mockImplementation(() => mockStream());

    mockModelInvoke.mockResolvedValue({ content: "should not be called" });

    await useCareerStore.getState().sendMessage("Help with my resume", "resume");

    expect(createResumeChatAgent).toHaveBeenCalled();
    expect(mockResumeAgentStream).toHaveBeenCalled();
    // Agent was seeded with current resume data
    expect(mockSeedResume).toHaveBeenCalled();

    const state = useCareerStore.getState();
    expect(state.messages.some((m) => m.type === "tool")).toBe(false);
  });

  it("falls back to plain LLM call for router agent (no dedicated agent)", async () => {
    // Setup model.stream to yield a plain text response
    mockModelStream.mockImplementation(() => {
      async function* stream() {
        yield { content: "Hello! How can I help you today?" };
      }
      return stream();
    });

    const { createProfileChatAgent } = await import("../../shared/agents/profileChatAgent");

    await useCareerStore.getState().sendMessage("Hello", "router");

    // Router should NOT create profile agent
    expect(createProfileChatAgent).not.toHaveBeenCalled();
    // Router should use the plain model.stream fallback
    expect(mockModelStream).toHaveBeenCalled();
  });

  describe("streaming reasoning", () => {
    it("progressively accumulates text into a single AI message during streaming", async () => {
      // Arrange: stream yields thinking chunks then multiple text chunks
      async function* mockStream() {
        yield [
          { type: "ai", content: [{ type: "thinking", thinking: "Let me analyze", index: 0 }] },
          {},
        ];
        yield [
          { type: "ai", content: [{ type: "thinking", thinking: " the profile...", index: 0 }] },
          {},
        ];
        yield [{ type: "ai", content: "I can see" }, {}];
        yield [{ type: "ai", content: " you're" }, {}];
        yield [{ type: "ai", content: " a Blue-dominant profile." }, {}];
      }

      mockProfileAgentStream.mockImplementation(() => mockStream());
      mockGetProfile.mockReturnValue({});

      // Subscribe to capture messages during streaming
      const messagesDuringStream: Array<Array<{ type: string; content: string }>> = [];
      const unsubscribe = useCareerStore.subscribe((state) => {
        if (state.isStreaming) {
          messagesDuringStream.push([...state.messages]);
        }
      });

      await useCareerStore.getState().sendMessage("Analyze me", "profile");
      unsubscribe();

      // Bug 1 fix: exactly ONE new AI message (not one per chunk)
      const state = useCareerStore.getState();
      const aiMessages = state.messages.filter((m) => m.type === "ai");
      expect(aiMessages).toHaveLength(1);
      expect(aiMessages[0].content).toBe("I can see you're a Blue-dominant profile.");

      // Bug 2 fix: previous messages are preserved (user message + new AI)
      expect(state.messages).toHaveLength(2); // human + ai
      expect(state.messages[0].type).toBe("human");
      expect(state.messages[0].content).toBe("Analyze me");

      // Bug 3 fix: AI message appeared during streaming (before stream ended)
      expect(messagesDuringStream.length).toBeGreaterThan(0);
      const aiDuringStream = messagesDuringStream.some((msgs) =>
        msgs.some((m) => m.type === "ai" && m.content.includes("Blue-dominant")),
      );
      expect(aiDuringStream).toBe(true);
    });

    it("preserves existing conversation history when streaming new response", async () => {
      // Pre-populate store with a full conversation
      useCareerStore.setState({
        messages: [
          { type: "human", content: "Previous question" },
          { type: "ai", content: "Previous answer" },
        ],
      });

      async function* mockStream() {
        yield [{ type: "ai", content: "New response here." }, {}];
      }

      mockProfileAgentStream.mockImplementation(() => mockStream());
      mockGetProfile.mockReturnValue({});

      await useCareerStore.getState().sendMessage("New question", "profile");

      const state = useCareerStore.getState();
      // All previous messages preserved
      expect(state.messages).toHaveLength(4);
      expect(state.messages[0].content).toBe("Previous question");
      expect(state.messages[1].content).toBe("Previous answer");
      expect(state.messages[2].content).toBe("New question");
      expect(state.messages[3].content).toBe("New response here.");
    });
  });
});
