// src/shared/agents/experienceChatAgent.test.ts
// ---------------------------------------------------------------------------
// Tests for experienceChatAgent — verifies the factory returns the correct
// interface shape and that seedExperiences / getExperiences / reset work
// through the mutable closure.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";

// ── Pure hash helper (mirrors what write_state tools use) ────────────

function extractionHash(messages: Array<{ type: string; content: string }>): string {
  return messages
    .filter((m) => m.type !== "system")
    .map((m) => m.content)
    .join("|");
}

// ── Mock getModel — async factory calls await getModel()
vi.mock("../llm-provider", () => ({
  getModel: vi.fn().mockResolvedValue({
    withStructuredOutput: vi.fn(() => ({
      invoke: vi.fn().mockResolvedValue({}),
    })),
    invoke: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock("langchain", () => ({
  createAgent: vi.fn(() => ({
    stream: vi.fn(),
    getState: vi.fn(),
  })),
}));

vi.mock("@langchain/core/tools", () => ({
  tool: vi.fn((fn: unknown, _config: unknown) => fn),
}));

vi.mock("@langchain/core/messages", () => ({
  SystemMessage: class {
    content: string;
    constructor(content: string) {
      this.content = content;
    }
  },
}));

import { createExperienceChatAgent } from "./experienceChatAgent";

describe("createExperienceChatAgent", () => {
  it("returns agent, seedExperiences, getExperiences, and reset", async () => {
    const result = await createExperienceChatAgent();

    expect(result.agent).toBeDefined();
    expect(typeof result.seedExperiences).toBe("function");
    expect(typeof result.getExperiences).toBe("function");
    expect(typeof result.reset).toBe("function");
  });

  describe("seedExperiences / getExperiences", () => {
    it("returns an empty array by default", async () => {
      const { getExperiences } = await createExperienceChatAgent();

      const exps = getExperiences();
      expect(exps).toEqual([]);
    });

    it("returns seeded experiences", async () => {
      const { seedExperiences, getExperiences } = await createExperienceChatAgent();

      seedExperiences([
        {
          id: "exp-1",
          company: "Acme Corp",
          title: "Senior Engineer",
          startDate: "2020-01",
          endDate: "2023-06",
          sector: "Tech",
          raciRoles: ["Responsible"],
          keyProjects: ["Project X"],
          quantifiedAchievements: ["Revenue +20%"],
          skillsDemonstrated: [{ name: "TypeScript", category: "technical" }],
          challenges: "Scaling",
          rawNotes: "Great role",
        },
      ]);

      const exps = getExperiences();
      expect(exps).toHaveLength(1);
      expect(exps[0].company).toBe("Acme Corp");
      expect(exps[0].title).toBe("Senior Engineer");
    });
  });

  describe("reset", () => {
    it("clears all accumulated experiences", async () => {
      const { seedExperiences, getExperiences, reset } = await createExperienceChatAgent();

      seedExperiences([
        {
          id: "exp-1",
          company: "Test",
          title: "Dev",
          startDate: "2020-01",
          endDate: "present",
          sector: "Tech",
          raciRoles: ["Responsible"],
          keyProjects: [],
          quantifiedAchievements: [],
          skillsDemonstrated: [],
          challenges: "",
          rawNotes: "",
        },
      ]);

      expect(getExperiences()).toHaveLength(1);

      reset();

      expect(getExperiences()).toEqual([]);
    });
  });

  describe("extraction dedup hash", () => {
    it("returns same hash for identical messages", () => {
      const msgsA = [
        { type: "human", content: "I worked at Acme as a senior engineer" },
        { type: "ai", content: "Tell me about your achievements there" },
        { type: "human", content: "I increased revenue by 20%" },
      ];
      const msgsB = [
        { type: "human", content: "I worked at Acme as a senior engineer" },
        { type: "ai", content: "Tell me about your achievements there" },
        { type: "human", content: "I increased revenue by 20%" },
      ];

      expect(extractionHash(msgsA)).toBe(extractionHash(msgsB));
    });

    it("returns different hash when content differs", () => {
      const msgsA = [{ type: "human", content: "I worked at Acme" }];
      const msgsB = [{ type: "human", content: "I worked at Beta Inc" }];

      expect(extractionHash(msgsA)).not.toBe(extractionHash(msgsB));
    });

    it("skips system messages when computing hash", () => {
      const withSystem = [
        { type: "system", content: "You are an AI coach" },
        { type: "human", content: "Hello" },
      ];
      const withoutSystem = [{ type: "human", content: "Hello" }];

      expect(extractionHash(withSystem)).toBe(extractionHash(withoutSystem));
    });
  });
});
