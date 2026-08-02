// src/shared/agents/resumeChatAgent.test.ts
// ---------------------------------------------------------------------------
// Tests for resumeChatAgent — verifies the factory returns the correct
// interface shape and that seedResume / getResume / reset work through
// the mutable closure.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";

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
  tool: vi.fn((fn: unknown, config: unknown) => fn),
}));

vi.mock("@langchain/core/messages", () => ({
  SystemMessage: class {
    content: string;
    constructor(content: string) {
      this.content = content;
    }
  },
}));

import { createResumeChatAgent } from "./resumeChatAgent";
import type { ResumeData } from "../../shared/state";

const sampleResume: ResumeData = {
  firstName: "Marie",
  lastName: "Dupont",
  phone: "+33 6 12 34 56 78",
  email: "marie@example.com",
  linkedin: "linkedin.com/in/mariedupont",
  otherNetworks: "",
  nationality: "French",
  country: "France",
  title: "Senior PM",
  bannerHighlights: "10 years in SaaS",
  keySkills: [
    { name: "Product Strategy", category: "technical" },
    { name: "SQL", category: "technical" },
  ],
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
};

describe("createResumeChatAgent", () => {
  it("returns agent, seedResume, getResume, and reset", async () => {
    const result = await createResumeChatAgent();

    expect(result.agent).toBeDefined();
    expect(typeof result.seedResume).toBe("function");
    expect(typeof result.getResume).toBe("function");
    expect(typeof result.reset).toBe("function");
  });

  describe("seedResume / getResume", () => {
    it("returns empty default resume data by default", async () => {
      const { getResume } = await createResumeChatAgent();

      const data = getResume();
      expect(data.firstName).toBe("");
      expect(data.lastName).toBe("");
      expect(data.keySkills).toEqual([]);
      expect(data.education).toEqual([]);
      expect(data.languages).toEqual([]);
    });

    it("returns seeded resume data", async () => {
      const { seedResume, getResume } = await createResumeChatAgent();

      seedResume(sampleResume);

      const data = getResume();
      expect(data.firstName).toBe("Marie");
      expect(data.lastName).toBe("Dupont");
      expect(data.title).toBe("Senior PM");
      expect(data.keySkills).toEqual([
        { name: "Product Strategy", category: "technical" },
        { name: "SQL", category: "technical" },
      ]);
      expect(data.education).toHaveLength(1);
      expect(data.languages).toHaveLength(1);
    });
  });

  describe("reset", () => {
    it("clears all accumulated resume data", async () => {
      const { seedResume, getResume, reset } = await createResumeChatAgent();

      seedResume(sampleResume);
      expect(getResume().firstName).toBe("Marie");

      reset();

      expect(getResume().firstName).toBe("");
      expect(getResume().keySkills).toEqual([]);
    });
  });
});
