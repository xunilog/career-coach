// src/services/career-data-service.test.ts
// ---------------------------------------------------------------------------
// Tests for career-data-service.ts — resume draft persistence
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getResumeDraft, saveResumeDraft } from "./career-data-service";
import type { ResumeData } from "../shared/state";

type MockDatabase = {
  execute: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

function makeMockDb(): MockDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue([]),
  };
}

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
  languages: [
    { id: "lang-1", language: "French", proficiency: "native" },
    { id: "lang-2", language: "English", proficiency: "fluent" },
  ],
};

describe("saveResumeDraft", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("persists resume data as JSON in the draft column", async () => {
    await saveResumeDraft(db as unknown as Parameters<typeof saveResumeDraft>[0], sampleResume);

    expect(db.execute).toHaveBeenCalledOnce();
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain("INSERT INTO resume_draft");
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE");
    // params: [title, json]
    expect(params[0]).toBe("Senior PM"); // title → target_job
    const json = JSON.parse(params[1]);
    expect(json.firstName).toBe("Marie");
    expect(json.lastName).toBe("Dupont");
    expect(json.keySkills).toEqual([
      { name: "Product Strategy", category: "technical" },
      { name: "SQL", category: "technical" },
    ]);
    expect(json.education).toHaveLength(1);
    expect(json.languages).toHaveLength(2);
  });
});

describe("getResumeDraft", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("returns null when no resume exists", async () => {
    db.select.mockResolvedValue([]);

    const result = await getResumeDraft(db as unknown as Parameters<typeof getResumeDraft>[0]);

    expect(result).toBeNull();
  });

  it("parses structured resume from JSON in the draft column", async () => {
    db.select.mockResolvedValue([
      {
        id: 1,
        target_job: "Senior PM",
        draft: JSON.stringify(sampleResume),
      },
    ]);

    const result = await getResumeDraft(db as unknown as Parameters<typeof getResumeDraft>[0]);

    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("Marie");
    expect(result!.lastName).toBe("Dupont");
    expect(result!.email).toBe("marie@example.com");
    expect(result!.title).toBe("Senior PM");
    expect(result!.keySkills).toEqual([
      { name: "Product Strategy", category: "technical" },
      { name: "SQL", category: "technical" },
    ]);
    expect(result!.education).toHaveLength(1);
    expect(result!.education[0].institution).toBe("HEC Paris");
    expect(result!.languages).toHaveLength(2);
    expect(result!.languages[1].proficiency).toBe("fluent");
  });

  it("lazy-migrates old-format string[] keySkills to Skill[]", async () => {
    const oldFormat = {
      ...sampleResume,
      keySkills: ["Product Strategy", "SQL"],
    };
    db.select.mockResolvedValue([
      {
        id: 1,
        target_job: "Senior PM",
        draft: JSON.stringify(oldFormat),
      },
    ]);

    const result = await getResumeDraft(db as unknown as Parameters<typeof getResumeDraft>[0]);

    expect(result).not.toBeNull();
    expect(result!.keySkills).toEqual([
      { name: "Product Strategy", category: "technical" },
      { name: "SQL", category: "technical" },
    ]);
  });

  it("passes new-format Skill[] through unchanged", async () => {
    db.select.mockResolvedValue([
      {
        id: 1,
        target_job: "Senior PM",
        draft: JSON.stringify(sampleResume),
      },
    ]);

    const result = await getResumeDraft(db as unknown as Parameters<typeof getResumeDraft>[0]);

    expect(result).not.toBeNull();
    expect(result!.keySkills).toEqual([
      { name: "Product Strategy", category: "technical" },
      { name: "SQL", category: "technical" },
    ]);
  });
});
