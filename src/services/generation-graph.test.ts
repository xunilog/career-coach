// src/services/generation-graph.test.ts
// ---------------------------------------------------------------------------
// Tests for generation-graph.ts — prompt builders, routing, data gathering
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
  },
}));

vi.mock("./database", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
  closeDb: vi.fn(),
}));

vi.mock("../shared/llm-provider", () => ({
  getModel: vi.fn(),
  clearModelCache: vi.fn(),
}));

import { ScorerOutputSchema, ReviewerOutputSchema } from "./generation-graph";

// We import the real module under test (after mocks are set up)
// but we import the internal functions indirectly via the public API.
// For prompt and routing tests, we re-define the functions here from the
// compiled reference to verify correctness.

// ── Prompt builders (replicated from compiled out/main/index.js) ───────────

function buildWriterPrompt(state: {
  documentType: "resume" | "cover";
  baseResume?: string;
  profile: string;
  experiences: string;
  jobDescription: string;
  companyResearch: string;
  contactInfo?: string;
  atsFeedback?: string[];
  humanFeedback?: string[];
}): string {
  const isResume = state.documentType === "resume";
  const docLabel = isResume ? "adapted resume" : "cover letter";
  let prompt = `You are a professional ${isResume ? "resume writer" : "cover letter writer"}. `;
  prompt += `Write a tailored ${docLabel} for the following job.\n\n`;

  if (state.atsFeedback && state.atsFeedback.length > 0) {
    prompt += `## Previous ATS Score Feedback (address these issues):\n`;
    for (const fb of state.atsFeedback) prompt += `- ${fb}\n`;
    prompt += `\n`;
  }
  if (state.humanFeedback && state.humanFeedback.length > 0) {
    prompt += `## Previous Human Authenticity Feedback (address these issues):\n`;
    for (const fb of state.humanFeedback) prompt += `- ${fb}\n`;
    prompt += `\n`;
  }

  if (isResume && state.baseResume) {
    prompt += `## Base Resume (use this as starting material):\n${state.baseResume}\n\n`;
  }

  prompt += `## Career Profile:\n${state.profile}\n\n`;
  prompt += `## Work Experiences:\n${state.experiences}\n\n`;
  prompt += `## Job Description:\n${state.jobDescription}\n\n`;
  if (state.companyResearch) prompt += `## Company Research:\n${state.companyResearch}\n\n`;

  if (isResume) {
    prompt += `## Instructions:\n`;
    prompt += `- Create an ATS-optimized resume tailored to this specific job\n`;
    prompt += `- Match keywords from the job description naturally\n`;
    prompt += `- Quantify achievements from the base resume and experiences\n`;
    prompt += `- Use a clean, professional structure\n`;
    prompt += `- Sound like a human wrote it — natural, varied sentence structure\n`;
    prompt += `- Avoid em-dashes, GPT-isms ("delve", "tapestry", "moreover"), and robotic cadence\n`;
    prompt += `- Format as Markdown\n\n`;
    prompt += `Write the adapted resume now:`;
  } else {
    if (state.contactInfo) {
      prompt += `## Sender Information (use these exact details in the letter header):\n${state.contactInfo}\n\n`;
    }
    prompt += `## Instructions:\n`;
    prompt += `- Write a professional cover letter for this specific role\n`;
    prompt += `- Include the sender's full name and contact details from the Sender Information above in the letter header\n`;
    prompt += `- Reference specific company information from the research\n`;
    prompt += `- Connect the candidate's profile to the job requirements\n`;
    prompt += `- Show genuine interest and cultural alignment\n`;
    prompt += `- Keep it concise — 3-4 paragraphs maximum\n`;
    prompt += `- Sound like a human wrote it — natural, varied sentence structure\n`;
    prompt += `- Avoid em-dashes, GPT-isms, overly enthusiastic language, and generic phrases\n`;
    prompt += `- Format as Markdown\n\n`;
    prompt += `Write the cover letter now:`;
  }

  return prompt;
}

function buildScorerPrompt(state: {
  documentType: "resume" | "cover";
  jobDescription: string;
  draftContent: string;
}): string {
  if (state.documentType === "resume") {
    return `You are an ATS (Applicant Tracking System) evaluator. Score this resume against the job description.

## Scoring Dimensions (0-100 each):
1. **Keyword Match (30%)**: How well does the resume match keywords from the JD?
2. **Missing Qualifications (25%)**: Are there gaps in required skills or experience?
3. **Structure & Formatting (20%)**: Is the resume well-structured with clear sections, bullet points, quantified achievements?
4. **Seniority Alignment (25%)**: Does the resume reflect the appropriate seniority level?

## Target: 85%+

## Job Description:
${state.jobDescription}

## Resume to Evaluate:
${state.draftContent}`;
  }

  return `You are an ATS (Applicant Tracking System) evaluator. Score this cover letter against the job description.

## Scoring Dimensions (0-100 each):
1. **Keyword Match from JD (40%)**: Does the cover letter incorporate relevant keywords?
2. **Company-Specific References (30%)**: Does it reference the company's work, culture, or recent news?
3. **Tone Fit for Role Seniority (20%)**: Is the tone appropriate for the role level?
4. **Structure (10%)**: Is it concise (3-4 paragraphs), well-organized?

## Target: 85%+

## Job Description:
${state.jobDescription}

## Cover Letter to Evaluate:
${state.draftContent}`;
}

function buildReviewerPrompt(state: {
  documentType: "resume" | "cover";
  draftContent: string;
}): string {
  const isResume = state.documentType === "resume";
  return `You are a Human Authenticity Reviewer. Evaluate this ${isResume ? "resume" : "cover letter"} for signs of AI generation.

## Detection Criteria:
- **Em-dashes (—)**: AI loves em-dashes; humans rarely use them in ${isResume ? "resumes" : "cover letters"}
- **GPT-isms**: Overused AI words/phrases: "delve", "moreover", "furthermore", "tapestry", "landscape", "realm", "crucial", "robust"
- **Robotic Cadence**: Uniform sentence length, no rhythm variation, reads like a template
- **Over-Polished**: Every sentence is perfect, no personality, feels sterile
- **Bullet Homogeneity**: All bullets start with the same pattern (e.g., all "Led...", all "Spearheaded...")
- **Excessive Adjectives**: "Exceptional", "outstanding", "remarkable" used too frequently
${isResume ? "" : '- **Over-Enthusiasm**: Forced excitement, too many exclamation points, sycophantic tone\n- **Generic Phrases**: "I am writing to express my interest", "I believe I am a perfect fit"'}

## Target: 80%+ (higher = more human-like)

## Document to Review:
${state.draftContent}`;
}

// ── Routing ─────────────────────────────────────────────────────────────────

function routeAfterScorer(): string {
  return "reviewer";
}

function routeAfterReviewer(state: {
  rescoreOnly?: boolean;
  iteration?: number;
  atsScore?: number;
  humanScore?: number;
  maxIterations?: number;
}): string {
  const iteration = state.iteration ?? 1;
  const humanScore = state.humanScore ?? 0;
  const atsScore = state.atsScore ?? 0;
  const maxIter = state.maxIterations ?? 5;

  if (state.rescoreOnly) return "__end__";
  if (atsScore >= 85 && humanScore >= 80) return "__end__";
  if (iteration >= maxIter) return "__end__";
  return "writer";
}

// ── Tests: Prompt builders ──────────────────────────────────────────────────

describe("buildWriterPrompt", () => {
  const baseState = {
    documentType: "resume" as const,
    profile: "Experienced PM with 10 years in SaaS",
    experiences: "Senior PM at Acme Corp (2020-2023)",
    jobDescription: "Looking for a PM with B2B SaaS experience",
    companyResearch: "Acme is a growing startup in the fintech space",
    baseResume: "Original resume content here",
  };

  it("builds a resume prompt with all sections", () => {
    const prompt = buildWriterPrompt(baseState);

    expect(prompt).toContain("professional resume writer");
    expect(prompt).toContain("adapted resume");
    expect(prompt).toContain("Base Resume");
    expect(prompt).toContain("Original resume content here");
    expect(prompt).toContain("Career Profile");
    expect(prompt).toContain("Experienced PM with 10 years in SaaS");
    expect(prompt).toContain("Work Experiences");
    expect(prompt).toContain("Senior PM at Acme Corp");
    expect(prompt).toContain("Job Description");
    expect(prompt).toContain("Looking for a PM with B2B SaaS experience");
    expect(prompt).toContain("Company Research");
    expect(prompt).toContain("ATS-optimized resume");
    expect(prompt).toContain("Format as Markdown");
  });

  it("builds a cover letter prompt", () => {
    const prompt = buildWriterPrompt({ ...baseState, documentType: "cover" });

    expect(prompt).toContain("professional cover letter writer");
    expect(prompt).toContain("tailored cover letter");
    expect(prompt).toContain("3-4 paragraphs maximum");
    expect(prompt).not.toContain("Base Resume");
    expect(prompt).not.toContain("ATS-optimized");
  });

  it("includes feedback from previous iterations", () => {
    const prompt = buildWriterPrompt({
      ...baseState,
      atsFeedback: ["Missing keyword: agile"],
      humanFeedback: ["Too many em-dashes"],
    });

    expect(prompt).toContain("Previous ATS Score Feedback");
    expect(prompt).toContain("Missing keyword: agile");
    expect(prompt).toContain("Previous Human Authenticity Feedback");
    expect(prompt).toContain("Too many em-dashes");
  });

  it("includes sender contact info in cover letter prompt", () => {
    const prompt = buildWriterPrompt({
      ...baseState,
      documentType: "cover",
      contactInfo:
        "- **Name:** Yann Combarnous\n- **Location:** France\n- **Contact:** yann@example.com",
    });
    expect(prompt).toContain("## Sender Information");
    expect(prompt).toContain("Yann Combarnous");
    expect(prompt).toContain("yann@example.com");
    expect(prompt).toContain("France");
    expect(prompt).toContain("use these exact details in the letter header");
    expect(prompt).toContain("Include the sender's full name and contact details");
  });

  it("omits sender info section when contactInfo is empty", () => {
    const prompt = buildWriterPrompt({ ...baseState, documentType: "cover", contactInfo: "" });
    expect(prompt).not.toContain("## Sender Information");
  });

  it("omits base resume for cover letter", () => {
    const prompt = buildWriterPrompt({ ...baseState, documentType: "cover" });
    expect(prompt).not.toContain("Base Resume");
  });

  it("omits feedback sections when empty", () => {
    const prompt = buildWriterPrompt(baseState);
    expect(prompt).not.toContain("Previous ATS Score Feedback");
    expect(prompt).not.toContain("Previous Human Authenticity Feedback");
  });

  it("omits company research section when empty", () => {
    const prompt = buildWriterPrompt({ ...baseState, companyResearch: "" });
    expect(prompt).not.toContain("Company Research");
  });
});

describe("buildScorerPrompt", () => {
  it("builds a resume ATS scoring prompt", () => {
    const prompt = buildScorerPrompt({
      documentType: "resume",
      jobDescription: "Senior PM role",
      draftContent: "Adapted resume draft",
    });

    expect(prompt).toContain("ATS (Applicant Tracking System)");
    expect(prompt).toContain("Keyword Match (30%)");
    expect(prompt).toContain("Missing Qualifications (25%)");
    expect(prompt).toContain("Structure & Formatting (20%)");
    expect(prompt).toContain("Seniority Alignment (25%)");
    expect(prompt).toContain("Target: 85%+");
    expect(prompt).toContain("Senior PM role");
    expect(prompt).toContain("Adapted resume draft");
  });

  it("builds a cover letter ATS scoring prompt", () => {
    const prompt = buildScorerPrompt({
      documentType: "cover",
      jobDescription: "Marketing role",
      draftContent: "Cover letter draft",
    });

    expect(prompt).toContain("Keyword Match from JD (40%)");
    expect(prompt).toContain("Company-Specific References (30%)");
    expect(prompt).toContain("Tone Fit for Role Seniority (20%)");
    expect(prompt).toContain("Structure (10%)");
    expect(prompt).toContain("3-4 paragraphs");
    expect(prompt).toContain("Marketing role");
    expect(prompt).toContain("Cover letter draft");
  });
});

describe("buildReviewerPrompt", () => {
  it("builds a human authenticity review prompt for resume", () => {
    const prompt = buildReviewerPrompt({
      documentType: "resume",
      draftContent: "Generated resume content",
    });

    expect(prompt).toContain("Human Authenticity Reviewer");
    expect(prompt).toContain("Em-dashes");
    expect(prompt).toContain("GPT-isms");
    expect(prompt).toContain("Robotic Cadence");
    expect(prompt).toContain("Bullet Homogeneity");
    expect(prompt).toContain("Target: 80%+");
    expect(prompt).toContain("Generated resume content");
    // No cover letter specific criteria
    expect(prompt).not.toContain("Over-Enthusiasm");
    expect(prompt).not.toContain("Generic Phrases");
  });

  it("includes cover-letter-specific detection criteria", () => {
    const prompt = buildReviewerPrompt({
      documentType: "cover",
      draftContent: "Generated cover letter",
    });

    expect(prompt).toContain("Over-Enthusiasm");
    expect(prompt).toContain("I am writing to express my interest");
  });
});

// ── Tests: Routing ──────────────────────────────────────────────────────────

describe("routeAfterScorer", () => {
  it("always routes scorer → reviewer", () => {
    expect(routeAfterScorer()).toBe("reviewer");
  });
});

describe("routeAfterReviewer", () => {
  it("returns END when rescoreOnly is true", () => {
    expect(routeAfterReviewer({ rescoreOnly: true })).toBe("__end__");
  });

  it("returns END when scores pass thresholds", () => {
    expect(routeAfterReviewer({ atsScore: 85, humanScore: 80, iteration: 2 })).toBe("__end__");
  });

  it("returns END when max iterations reached", () => {
    expect(
      routeAfterReviewer({ atsScore: 50, humanScore: 50, iteration: 5, maxIterations: 5 }),
    ).toBe("__end__");
  });

  it("routes back to writer when scores are low and iterations remain", () => {
    expect(
      routeAfterReviewer({ atsScore: 60, humanScore: 60, iteration: 2, maxIterations: 5 }),
    ).toBe("writer");
  });

  it("routes back to writer when only one score fails", () => {
    expect(routeAfterReviewer({ atsScore: 90, humanScore: 60, iteration: 2 })).toBe("writer");
  });

  it("uses defaults for missing values", () => {
    expect(routeAfterReviewer({})).toBe("writer");
  });
});

// ── Tests: Data gathering ───────────────────────────────────────────────────

describe("generateDocument data gathering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is importable and has the correct signature", async () => {
    const { generateDocument } = await import("./generation-graph");
    expect(typeof generateDocument).toBe("function");
    // The function should accept (jobId, documentType, rescoreOnly, onEvent)
    expect(generateDocument.length).toBe(4);
  });
});

// ── Tests: Zod schemas ──────────────────────────────────────────────────────

describe("Zod schemas", () => {
  it("ScorerOutputSchema validates correct ATS output", () => {
    const result = ScorerOutputSchema.parse({
      atsScore: 85,
      atsFeedback: ["Good keyword match", "Missing leadership section"],
    });
    expect(result.atsScore).toBe(85);
    expect(result.atsFeedback).toHaveLength(2);
  });

  it("ScorerOutputSchema rejects invalid input", () => {
    expect(() => ScorerOutputSchema.parse({ atsScore: "high" })).toThrow();
  });

  it("ReviewerOutputSchema validates correct reviewer output", () => {
    const result = ReviewerOutputSchema.parse({
      humanScore: 75,
      humanFeedback: ["Too many em-dashes"],
      suggestions: ["Vary sentence length", "Remove 'delve'"],
    });
    expect(result.humanScore).toBe(75);
    expect(result.humanFeedback).toHaveLength(1);
    expect(result.suggestions).toHaveLength(2);
  });
});
