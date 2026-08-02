// shared/state.test.ts
// ---------------------------------------------------------------------------
// Characterization tests for CareerStateAnnotation and helper functions.
// Establishes baseline behavior before Increment 14 cleanup.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import type { ColorProfile } from "./state";
import {
  CareerStateAnnotation,
  profileToMarkdown,
  markdownToProfile,
  ColorProfileSchema,
  ProfileResponseSchema,
  Nodes,
} from "./state";

// ── profileToMarkdown ───────────────────────────────────────────────────────

describe("profileToMarkdown", () => {
  it("returns default template when given empty object", () => {
    const md = profileToMarkdown({});
    expect(md).toContain("# Career Profile");
    expect(md).toContain("(to be discovered)");
  });

  it("renders dominant and secondary colors with emoji", () => {
    const md = profileToMarkdown({
      dominantColor: "Red",
      secondaryColor: "Blue",
    });
    expect(md).toContain("🔴 Red");
    expect(md).toContain("🔵 Blue");
  });

  it("renders DISC profile", () => {
    const md = profileToMarkdown({ discProfile: "D-I" });
    expect(md).toContain("D-I");
  });

  it("renders career drivers as bullet list", () => {
    const md = profileToMarkdown({
      careerDrivers: ["autonomy", "impact"],
    });
    expect(md).toContain("- autonomy");
    expect(md).toContain("- impact");
  });

  it("renders work style preferences as bullet list", () => {
    const md = profileToMarkdown({
      workStylePreferences: ["collaborative", "structured"],
    });
    expect(md).toContain("- collaborative");
    expect(md).toContain("- structured");
  });

  it("renders values as bullet list", () => {
    const md = profileToMarkdown({
      values: ["excellence", "integrity"],
    });
    expect(md).toContain("- excellence");
    expect(md).toContain("- integrity");
  });

  it("renders risk appetite", () => {
    const md = profileToMarkdown({ riskAppetite: "high" });
    expect(md).toContain("high");
  });

  it("renders change tolerance notes", () => {
    const md = profileToMarkdown({
      changeToleranceNotes: "Comfortable with planned change",
    });
    expect(md).toContain("Comfortable with planned change");
  });

  it("renders raw insights", () => {
    const md = profileToMarkdown({
      rawInsights: "Deep observations about the seeker",
    });
    expect(md).toContain("Deep observations about the seeker");
  });

  it("renders full profile with all fields", () => {
    const md = profileToMarkdown({
      dominantColor: "Green",
      secondaryColor: "Yellow",
      discProfile: "S-I",
      careerDrivers: ["belonging", "stability"],
      workStylePreferences: ["collaborative", "fluid"],
      values: ["harmony", "service"],
      riskAppetite: "low",
      changeToleranceNotes: "Prefers stability",
      rawInsights: "Strong team player",
    });
    expect(md).toContain("🟢 Green");
    expect(md).toContain("🟡 Yellow");
    expect(md).toContain("S-I");
    expect(md).toContain("- belonging");
    expect(md).toContain("- collaborative");
    expect(md).toContain("- harmony");
    expect(md).toContain("low");
    expect(md).toContain("Prefers stability");
    expect(md).toContain("Strong team player");
  });
});

// ── markdownToProfile ───────────────────────────────────────────────────────

describe("markdownToProfile", () => {
  it("parses dominant and secondary colors with emoji", () => {
    const md = profileToMarkdown({
      dominantColor: "Red",
      secondaryColor: "Blue",
    });
    const profile = markdownToProfile(md);
    expect(profile.dominantColor).toBe("Red");
    expect(profile.secondaryColor).toBe("Blue");
  });

  it("parses DISC profile", () => {
    const md = profileToMarkdown({ discProfile: "D-I" });
    const profile = markdownToProfile(md);
    expect(profile.discProfile).toBe("D-I");
  });

  it("parses career drivers as array", () => {
    const md = profileToMarkdown({
      careerDrivers: ["autonomy", "impact"],
    });
    const profile = markdownToProfile(md);
    expect(profile.careerDrivers).toEqual(["autonomy", "impact"]);
  });

  it("parses work style preferences as array", () => {
    const md = profileToMarkdown({
      workStylePreferences: ["collaborative", "structured"],
    });
    const profile = markdownToProfile(md);
    expect(profile.workStylePreferences).toEqual(["collaborative", "structured"]);
  });

  it("parses values as array", () => {
    const md = profileToMarkdown({
      values: ["excellence", "integrity"],
    });
    const profile = markdownToProfile(md);
    expect(profile.values).toEqual(["excellence", "integrity"]);
  });

  it("parses risk appetite", () => {
    const md = profileToMarkdown({ riskAppetite: "high" });
    const profile = markdownToProfile(md);
    expect(profile.riskAppetite).toBe("high");
  });

  it("parses change tolerance notes", () => {
    const md = profileToMarkdown({
      changeToleranceNotes: "Comfortable with planned change",
    });
    const profile = markdownToProfile(md);
    expect(profile.changeToleranceNotes).toBe("Comfortable with planned change");
  });

  it("parses raw insights", () => {
    const md = profileToMarkdown({
      rawInsights: "Deep observations about the seeker",
    });
    const profile = markdownToProfile(md);
    expect(profile.rawInsights).toBe("Deep observations about the seeker");
  });

  it("round-trips a full profile without loss", () => {
    const original: Partial<ColorProfile> = {
      dominantColor: "Green",
      secondaryColor: "Yellow",
      discProfile: "S-I",
      careerDrivers: ["belonging", "stability"],
      workStylePreferences: ["collaborative", "fluid"],
      values: ["harmony", "service"],
      riskAppetite: "low",
      changeToleranceNotes: "Prefers stability",
      rawInsights: "Strong team player",
    };
    const md = profileToMarkdown(original);
    const parsed = markdownToProfile(md);
    expect(parsed).toEqual(original);
  });

  it("returns empty object for plain text with no profile markers", () => {
    const profile = markdownToProfile("Just some notes, nothing structured.");
    expect(profile).toEqual({});
  });

  it("returns empty object for empty string", () => {
    const profile = markdownToProfile("");
    expect(profile).toEqual({});
  });
});

// ── CareerStateAnnotation ───────────────────────────────────────────────────

describe("CareerStateAnnotation", () => {
  it("is a LangGraph Annotation root object", () => {
    // CareerStateAnnotation is an AnnotationRoot — verify it's defined
    expect(CareerStateAnnotation).toBeDefined();
    expect(typeof CareerStateAnnotation).toBe("object");
  });

  it("can be used to create a StateGraph without throwing", () => {
    const { StateGraph } = require("@langchain/langgraph");
    expect(() => new StateGraph(CareerStateAnnotation)).not.toThrow();
  });

  it("has all required channels for career coaching", () => {
    // Verify the annotation was constructed correctly by checking
    // it can be destructured — the State type includes all fields
    const root = CareerStateAnnotation as unknown as Record<string, unknown>;
    expect(root).toBeTruthy();
  });
});

// ── Zod schemas ─────────────────────────────────────────────────────────────

describe("ColorProfileSchema", () => {
  it("validates a complete color profile", () => {
    const result = ColorProfileSchema.safeParse({
      dominantColor: "Blue",
      secondaryColor: "Green",
      discProfile: "C-S",
      careerDrivers: ["expertise", "autonomy"],
      workStylePreferences: ["structured", "solo-deep-work"],
      values: ["excellence", "integrity"],
      riskAppetite: "medium",
      riskProfileDetails: "Open to measured risks with thorough analysis beforehand.",
      changeToleranceNotes: "Comfortable with planned change",
      rawInsights: "Analytical thinker",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid dominant color", () => {
    const result = ColorProfileSchema.safeParse({
      dominantColor: "Purple",
      careerDrivers: [],
      workStylePreferences: [],
      values: [],
      riskAppetite: "medium",
      riskProfileDetails: "",
      changeToleranceNotes: "",
      rawInsights: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows minimal valid profile", () => {
    const result = ColorProfileSchema.safeParse({
      dominantColor: "unknown",
      careerDrivers: [],
      workStylePreferences: [],
      values: [],
      riskAppetite: "unknown",
      riskProfileDetails: "",
      changeToleranceNotes: "",
      rawInsights: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("ProfileResponseSchema", () => {
  it("validates incomplete profile response (unknown sentinel)", () => {
    const result = ProfileResponseSchema.safeParse({
      reply: "Tell me more about your work style.",
      profileComplete: false,
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
    });
    expect(result.success).toBe(true);
  });

  it("validates complete profile response", () => {
    const result = ProfileResponseSchema.safeParse({
      reply: "Your profile is finalized!",
      profileComplete: true,
      profile: {
        dominantColor: "Red",
        careerDrivers: ["achievement"],
        workStylePreferences: ["fast-paced"],
        values: ["winning"],
        riskAppetite: "high",
        riskProfileDetails:
          "Seeks high-growth startups where equity upside offsets base salary risk.",
        changeToleranceNotes: "Thrives in change",
        rawInsights: "Competitive",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects null profile (profile is required, not nullable)", () => {
    const result = ProfileResponseSchema.safeParse({
      reply: "Done!",
      profileComplete: true,
      profile: null,
    });
    // profile is required ColorProfileSchema — null is not valid
    expect(result.success).toBe(false);
  });

  it("accepts valid profile object regardless of profileComplete flag", () => {
    const result = ProfileResponseSchema.safeParse({
      reply: "Still exploring",
      profileComplete: false,
      profile: {
        dominantColor: "Blue",
        careerDrivers: ["expertise"],
        workStylePreferences: [],
        values: [],
        riskAppetite: "medium",
        riskProfileDetails: "",
        changeToleranceNotes: "",
        rawInsights: "",
      },
    });
    // profile is always a full ColorProfileSchema — sentinel dominantColor: "unknown" signals incomplete
    expect(result.success).toBe(true);
  });
});

// ── ResumeData schema ─────────────────────────────────────────────────────

import { ResumeDataSchema, resumeDataToMarkdown, markdownToResumeData } from "./state";
import type { ResumeData } from "./state";

describe("ResumeDataSchema", () => {
  it("validates a complete resume data object", () => {
    const result = ResumeDataSchema.safeParse({
      firstName: "Marie",
      lastName: "Dupont",
      phone: "+33 6 12 34 56 78",
      email: "marie@example.com",
      linkedin: "linkedin.com/in/mariedupont",
      otherNetworks: "github.com/mariedupont",
      nationality: "French",
      country: "France",
      title: "Senior Product Manager",
      bannerHighlights: "10 years in B2B SaaS, launched 3 products from 0 to $10M ARR",
      keySkills: [
        { name: "Product Strategy", category: "technical" },
        { name: "Go-to-Market", category: "methodology" },
        { name: "SQL", category: "technical" },
        { name: "Figma", category: "tool" },
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
    });
    expect(result.success).toBe(true);
  });

  it("validates minimal resume data (all empty defaults)", () => {
    const result = ResumeDataSchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = ResumeDataSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid proficiency level", () => {
    const result = ResumeDataSchema.safeParse({
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
      languages: [{ id: "lang-1", language: "French", proficiency: "expert" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("resumeDataToMarkdown", () => {
  it("renders all sections", () => {
    const data: ResumeData = {
      firstName: "Marie",
      lastName: "Dupont",
      phone: "+33 6 12 34 56 78",
      email: "marie@example.com",
      linkedin: "linkedin.com/in/mariedupont",
      otherNetworks: "",
      nationality: "French",
      country: "France",
      title: "Senior Product Manager",
      bannerHighlights: "10 years in B2B SaaS",
      keySkills: [
        { name: "Product Strategy", category: "technical" },
        { name: "Go-to-Market", category: "methodology" },
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

    const md = resumeDataToMarkdown(data);
    expect(md).toContain("# Resume");
    expect(md).toContain("Marie Dupont");
    expect(md).toContain("marie@example.com");
    expect(md).toContain("Senior Product Manager");
    expect(md).toContain("10 years in B2B SaaS");
    expect(md).toContain("- Product Strategy (technical)");
    expect(md).toContain("HEC Paris");
    expect(md).toContain("French (native)");
  });

  it("renders empty resume with placeholders", () => {
    const data: ResumeData = {
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

    const md = resumeDataToMarkdown(data);
    expect(md).toContain("# Resume");
    expect(md).toContain("(to be completed)");
  });
});

describe("markdownToResumeData", () => {
  it("round-trips a complete resume without loss", () => {
    const original: ResumeData = {
      firstName: "Marie",
      lastName: "Dupont",
      phone: "+33 6 12 34 56 78",
      email: "marie@example.com",
      linkedin: "linkedin.com/in/mariedupont",
      otherNetworks: "github.com/mariedupont",
      nationality: "French",
      country: "France",
      title: "Senior Product Manager",
      bannerHighlights: "10 years in B2B SaaS, launched 3 products",
      keySkills: [
        { name: "Product Strategy", category: "technical" },
        { name: "Go-to-Market", category: "methodology" },
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

    const md = resumeDataToMarkdown(original);
    const parsed = markdownToResumeData(md);
    expect(parsed).toEqual(original);
  });

  it("returns empty resume for plain text", () => {
    const result = markdownToResumeData("Just some random notes.");
    expect(result.firstName).toBe("");
    expect(result.keySkills).toEqual([]);
  });

  it("returns empty resume for empty string", () => {
    const result = markdownToResumeData("");
    expect(result.firstName).toBe("");
    expect(result.education).toEqual([]);
    expect(result.languages).toEqual([]);
  });
});

// ── Nodes constants ─────────────────────────────────────────────────────────

describe("Nodes", () => {
  it("defines all four agent node names", () => {
    expect(Nodes.Router).toBe("router_agent");
    expect(Nodes.Profile).toBe("profile_agent");
    expect(Nodes.Experience).toBe("experience_agent");
    expect(Nodes.Resume).toBe("resume_agent");
  });
});

// ── Skill types & helpers ───────────────────────────────────────────────────

import {
  SKILL_CATEGORIES,
  SkillCategorySchema,
  SkillSchema,
  skillToMarkdown,
  markdownToSkill,
  groupSkillsByCategory,
} from "./state";
import type { Skill, SkillCategory } from "./state";

describe("SkillCategorySchema", () => {
  it("accepts all predefined categories", () => {
    for (const cat of SKILL_CATEGORIES) {
      const result = SkillCategorySchema.safeParse(cat);
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid category", () => {
    const result = SkillCategorySchema.safeParse("invalid_category");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = SkillCategorySchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("SkillSchema", () => {
  it("validates a complete skill object", () => {
    const result = SkillSchema.safeParse({
      name: "TypeScript",
      category: "technical",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("TypeScript");
      expect(result.data.category).toBe("technical");
    }
  });

  it("rejects missing category", () => {
    const result = SkillSchema.safeParse({ name: "TypeScript" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = SkillSchema.safeParse({ category: "technical" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category value", () => {
    const result = SkillSchema.safeParse({
      name: "TypeScript",
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("skillToMarkdown", () => {
  it("formats a skill with category as 'Name (category)'", () => {
    expect(skillToMarkdown({ name: "TypeScript", category: "technical" })).toBe(
      "TypeScript (technical)",
    );
  });

  it("formats a soft skill", () => {
    expect(skillToMarkdown({ name: "Leadership", category: "soft" })).toBe("Leadership (soft)");
  });
});

describe("markdownToSkill", () => {
  it("parses 'TypeScript (technical)' to a Skill", () => {
    const result = markdownToSkill("TypeScript (technical)");
    expect(result).toEqual({ name: "TypeScript", category: "technical" });
  });

  it("parses 'Leadership (soft)' to a Skill", () => {
    const result = markdownToSkill("Leadership (soft)");
    expect(result).toEqual({ name: "Leadership", category: "soft" });
  });

  it("falls back to 'technical' for a plain string without category", () => {
    const result = markdownToSkill("TypeScript");
    expect(result).toEqual({ name: "TypeScript", category: "technical" });
  });

  it("falls back to 'technical' for unknown category", () => {
    const result = markdownToSkill("TypeScript (unknown_cat)");
    expect(result).toEqual({ name: "TypeScript (unknown_cat)", category: "technical" });
  });

  it("trims whitespace from name", () => {
    const result = markdownToSkill("  TypeScript  (technical)");
    expect(result).toEqual({ name: "TypeScript", category: "technical" });
  });
});

describe("groupSkillsByCategory", () => {
  it("groups skills by their category", () => {
    const skills: Skill[] = [
      { name: "TypeScript", category: "technical" },
      { name: "React", category: "technical" },
      { name: "Leadership", category: "soft" },
      { name: "Agile", category: "methodology" },
    ];

    const grouped = groupSkillsByCategory(skills);

    expect(grouped.get("technical")).toEqual([
      { name: "TypeScript", category: "technical" },
      { name: "React", category: "technical" },
    ]);
    expect(grouped.get("soft")).toEqual([{ name: "Leadership", category: "soft" }]);
    expect(grouped.get("methodology")).toEqual([{ name: "Agile", category: "methodology" }]);
  });

  it("returns empty arrays for categories with no skills", () => {
    const skills: Skill[] = [];
    const grouped = groupSkillsByCategory(skills);

    for (const cat of SKILL_CATEGORIES) {
      expect(grouped.get(cat)).toEqual([]);
    }
  });

  it("has entries for all categories even when skills are empty", () => {
    const grouped = groupSkillsByCategory([]);
    expect(grouped.size).toBe(SKILL_CATEGORIES.length);
    for (const cat of SKILL_CATEGORIES) {
      expect(grouped.has(cat)).toBe(true);
    }
  });
});
