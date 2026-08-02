// src/services/generation-graph.ts
// ---------------------------------------------------------------------------
// GenerationGraph — LangGraph pipeline for adapted resume and cover letter
// generation: Writer → Scorer (ATS) → Reviewer (Human Authenticity).
//
// Ported from src/main/generation-graph.ts (Electron main process).
// Adapted for Tauri: async DB via getDb(), callback streaming (no IPC).
// ---------------------------------------------------------------------------

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { z } from "zod/v4";
import { getModel } from "../shared/llm-provider";
import { getDb } from "./database";
import { SqlCheckpointer } from "./sql-checkpointer";
import { getJobById } from "./job-service";
import { getProfile, getExperiences, getResumeDraft } from "./career-data-service";
import { getResearchByJobId } from "./company-researcher";
import type { StreamEvent, DocumentType } from "../shared/types";

// ── Zod schemas for structured LLM output ────────────────────────────────

export const ScorerOutputSchema = z.object({
  atsScore: z.number(),
  atsFeedback: z.array(z.string()),
});

export const ReviewerOutputSchema = z.object({
  humanScore: z.number(),
  humanFeedback: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// ── LangGraph state ──────────────────────────────────────────────────────

const GenState = Annotation.Root({
  documentType: Annotation<DocumentType>(),
  baseResume: Annotation<string>(),
  profile: Annotation<string>(),
  experiences: Annotation<string>(),
  jobDescription: Annotation<string>(),
  companyResearch: Annotation<string>(),
  contactInfo: Annotation<string>(),
  rescoreOnly: Annotation<boolean>(),
  existingContent: Annotation<string>(),
  draftContent: Annotation<string>(),
  iteration: Annotation<number>(),
  maxIterations: Annotation<number>(),
  atsScore: Annotation<number>(),
  humanScore: Annotation<number>(),
  atsFeedback: Annotation<string[]>(),
  humanFeedback: Annotation<string[]>(),
  suggestions: Annotation<string[]>(),
  bestDraft: Annotation<string>(),
  bestCombinedScore: Annotation<number>(),
  bestIteration: Annotation<number>(),
  bestAtsScore: Annotation<number>(),
  bestHumanScore: Annotation<number>(),
});

type GenStateType = typeof GenState.State;

// ── Prompt builders ──────────────────────────────────────────────────────

function buildWriterPrompt(state: GenStateType): string {
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

function buildScorerPrompt(state: GenStateType): string {
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

function buildReviewerPrompt(state: GenStateType): string {
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

// ── Graph nodes ──────────────────────────────────────────────────────────

async function writerNode(state: GenStateType): Promise<Partial<GenStateType>> {
  const newIteration = (state.iteration ?? 0) + 1;

  if (state.rescoreOnly) {
    return {
      draftContent: state.existingContent ?? "",
      iteration: newIteration,
    };
  }

  const model = await getModel();
  const prompt = buildWriterPrompt(state);
  console.log(
    `[generation-graph] writerNode — iteration=${newIteration} promptLength=${prompt.length}`,
  );

  try {
    const response = await model.invoke(prompt);
    const content =
      typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    console.log(`[generation-graph] writerNode — response length=${content.length}`);
    return { draftContent: content, iteration: newIteration };
  } catch (err) {
    throw new Error(`Writer failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function scorerNode(state: GenStateType): Promise<Partial<GenStateType>> {
  const structuredModel = (await getModel()).withStructuredOutput(ScorerOutputSchema);
  const prompt = buildScorerPrompt(state);
  console.log(`[generation-graph] scorerNode — promptLength=${prompt.length}`);

  try {
    const parsed = await structuredModel.invoke(prompt);
    console.log(`[generation-graph] scorerNode — atsScore=${parsed.atsScore}`);
    return { atsScore: parsed.atsScore, atsFeedback: parsed.atsFeedback };
  } catch (err) {
    console.error("[generation-graph] Scorer failed:", err);
    return {
      atsScore: 70,
      atsFeedback: ["Scorer evaluation failed — continuing with default score"],
    };
  }
}

async function reviewerNode(state: GenStateType): Promise<Partial<GenStateType>> {
  const structuredModel = (await getModel()).withStructuredOutput(ReviewerOutputSchema);
  const prompt = buildReviewerPrompt(state);
  console.log(`[generation-graph] reviewerNode — promptLength=${prompt.length}`);

  try {
    const parsed = await structuredModel.invoke(prompt);
    console.log(
      `[generation-graph] reviewerNode — humanScore=${parsed.humanScore} suggestions=${parsed.suggestions?.length ?? 0}`,
    );

    const combinedScore = (state.atsScore ?? 0) + (parsed.humanScore ?? 0);
    const isBest = combinedScore > (state.bestCombinedScore ?? -1);

    return {
      humanScore: parsed.humanScore,
      humanFeedback: parsed.humanFeedback,
      suggestions: parsed.suggestions,
      bestDraft: isBest ? state.draftContent : state.bestDraft,
      bestCombinedScore: isBest ? combinedScore : state.bestCombinedScore,
      bestIteration: isBest ? state.iteration : state.bestIteration,
      bestAtsScore: isBest ? state.atsScore : state.bestAtsScore,
      bestHumanScore: isBest ? parsed.humanScore : state.bestHumanScore,
    };
  } catch (err) {
    console.error("[generation-graph] Reviewer failed:", err);
    return {
      humanScore: 70,
      humanFeedback: ["Reviewer evaluation failed — continuing with default score"],
      suggestions: [],
    };
  }
}

// ── Routing ──────────────────────────────────────────────────────────────

function routeAfterScorer(): string {
  return "reviewer";
}

function routeAfterReviewer(state: GenStateType): string {
  const iteration = state.iteration ?? 1;
  const humanScore = state.humanScore ?? 0;
  const atsScore = state.atsScore ?? 0;
  const maxIter = state.maxIterations ?? 5;

  if (state.rescoreOnly) return END;
  if (atsScore >= 85 && humanScore >= 80) return END;
  if (iteration >= maxIter) return END;
  return "writer";
}

// ── Graph construction ───────────────────────────────────────────────────

function buildGenerationGraph(checkpointer?: SqlCheckpointer) {
  const builder = new StateGraph(GenState)
    .addNode("writer", writerNode)
    .addNode("scorer", scorerNode)
    .addNode("reviewer", reviewerNode)
    .addEdge(START, "writer")
    .addEdge("writer", "scorer")
    .addConditionalEdges("scorer", routeAfterScorer, {
      writer: "writer",
      reviewer: "reviewer",
    })
    .addConditionalEdges("reviewer", routeAfterReviewer, {
      writer: "writer",
      [END]: END,
    });

  return builder.compile(checkpointer ? { checkpointer } : {});
}

let generationGraph = buildGenerationGraph();

export function setGenerationCheckpointer(checkpointer: SqlCheckpointer): void {
  generationGraph = buildGenerationGraph(checkpointer);
}

// ── Data gathering ───────────────────────────────────────────────────────

async function gatherGenerationData(
  jobId: string,
  documentType: DocumentType,
  rescoreOnly: boolean,
): Promise<{
  profile: string;
  experiences: string;
  jobDescription: string;
  companyResearch: string;
  baseResume: string;
  contactInfo: string;
  existingContent: string;
}> {
  const db = await getDb();

  // Job description
  const job = await getJobById(db, jobId);
  const jobDescription = job?.description ?? "";

  // Company research
  const research = await getResearchByJobId(db, jobId);
  let companyResearch = "";
  if (research) {
    const parts: string[] = [];
    if (research.overview) parts.push(`## Overview\n${research.overview}`);
    if (research.culture) parts.push(`## Culture\n${research.culture}`);
    if (research.news) parts.push(`## News\n${research.news}`);
    if (research.keyPeople) parts.push(`## Key People\n${research.keyPeople}`);
    if (research.market) parts.push(`## Market Position\n${research.market}`);
    companyResearch = parts.join("\n\n");
  }

  // Existing content (for rescoreOnly mode)
  let existingContent = "";
  if (rescoreOnly) {
    const table = documentType === "resume" ? "adapted_resumes" : "cover_letters";
    const existingRows = await db.select<Array<{ content: string | null }>>(
      `SELECT content FROM ${table} WHERE job_id = $1`,
      [jobId],
    );
    existingContent = existingRows[0]?.content ?? "";
  }

  // Career profile
  const profileRow = await getProfile(db);
  const profile =
    profileRow?.markdown || "[Career Profile not yet created — run the Profile Coach first]";

  // Work experiences
  const exps = await getExperiences(db);
  let experiences = "[No experiences captured yet — run the Experience Coach first]";
  if (exps.length > 0) {
    experiences = exps
      .map(
        (exp) =>
          `## ${exp.title} at ${exp.company} (${exp.startDate} – ${exp.endDate})\n${exp.rawNotes}`,
      )
      .join("\n\n");
  }

  // Base resume draft
  const resumeDraft = await getResumeDraft(db);
  const baseResume = resumeDraft ? JSON.stringify(resumeDraft) : "";
  let contactInfo = "";
  if (resumeDraft) {
    const name =
      [resumeDraft.firstName, resumeDraft.lastName].filter(Boolean).join(" ") || "(not set)";
    const location = resumeDraft.country || "(not set)";
    const contact =
      [resumeDraft.email, resumeDraft.phone, resumeDraft.linkedin].filter(Boolean).join(" | ") ||
      "(not set)";
    contactInfo = `- **Name:** ${name}\n- **Location:** ${location}\n- **Contact:** ${contact}`;
  }

  return {
    profile,
    experiences,
    jobDescription,
    companyResearch,
    baseResume,
    contactInfo,
    existingContent,
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export interface GenerateDocumentInput {
  documentType: DocumentType;
  jobId: string;
  rescoreOnly: boolean;
}

export interface GenerateDocumentResult {
  draftContent: string;
  atsScore: number;
  humanScore: number;
  iterations: number;
}

export type OnEventCallback = (event: StreamEvent) => void;

export async function generateDocument(
  jobId: string,
  documentType: DocumentType,
  rescoreOnly: boolean,
  onEvent: OnEventCallback,
): Promise<GenerateDocumentResult> {
  onEvent({
    type: "start",
    message: `Generating ${documentType === "resume" ? "resume" : "cover letter"}...`,
  });

  const {
    profile,
    experiences,
    jobDescription,
    companyResearch,
    baseResume,
    contactInfo,
    existingContent,
  } = await gatherGenerationData(jobId, documentType, rescoreOnly);

  const initialState = {
    documentType,
    baseResume,
    profile,
    experiences,
    jobDescription,
    companyResearch,
    contactInfo,
    rescoreOnly,
    existingContent,
    draftContent: existingContent ?? "",
    iteration: rescoreOnly ? 1 : 0,
    maxIterations: 5,
    atsScore: 0,
    humanScore: 0,
    atsFeedback: [],
    humanFeedback: [],
    suggestions: [],
    bestDraft: "",
    bestCombinedScore: -1,
    bestIteration: 0,
    bestAtsScore: 0,
    bestHumanScore: 0,
  };

  try {
    const stream = await generationGraph.stream(initialState, {
      configurable: { thread_id: `gen-${jobId}-${Date.now()}` },
      streamMode: "values",
    });

    let finalState: GenStateType | null = null;
    let prevIteration = 0;
    let prevDraft: string | undefined;
    let prevAtsScore = 0;
    let prevHumanScore = 0;

    for await (const state of stream) {
      finalState = state as GenStateType;
      const iter = finalState.iteration ?? 0;
      const draft = finalState.draftContent ?? "";
      const ats = finalState.atsScore ?? 0;
      const human = finalState.humanScore ?? 0;

      // New draft written
      if (iter > prevIteration && draft !== prevDraft && !finalState.rescoreOnly) {
        prevIteration = iter;
        prevDraft = draft;
        onEvent({
          type: "phase",
          phase: "writing",
          message: `Writing draft (iteration ${iter})...`,
        });
        if (draft) {
          onEvent({ type: "chunk", content: draft, phase: "writing" });
        }
      } else if (iter > prevIteration) {
        prevIteration = iter;
      }

      // ATS score changed
      if (ats > 0 && ats !== prevAtsScore) {
        prevAtsScore = ats;
        onEvent({
          type: "phase",
          phase: "scoring",
          message: `Scoring ATS match (iteration ${iter})...`,
        });
        onEvent({ type: "score", atsScore: ats, humanScore: 0, iteration: iter });
        const atsFb = finalState.atsFeedback ?? [];
        if (atsFb.length > 0) {
          onEvent({ type: "feedback", atsFeedback: atsFb });
        }
      }

      // Human score changed
      if (human > 0 && human !== prevHumanScore) {
        prevHumanScore = human;
        onEvent({
          type: "phase",
          phase: "reviewing",
          message: `Reviewing human authenticity (iteration ${iter})...`,
        });
        onEvent({ type: "score", atsScore: ats, humanScore: human, iteration: iter });
        const humanFb = finalState.humanFeedback ?? [];
        if (humanFb.length > 0) {
          onEvent({ type: "feedback", humanFeedback: humanFb });
        }
        const suggestions = finalState.suggestions ?? [];
        if (suggestions.length > 0) {
          onEvent({ type: "personalization", suggestions });
        }
      }
    }

    if (!finalState) {
      throw new Error("No final state returned from generation graph");
    }

    const useBest = (finalState.bestCombinedScore ?? -1) >= 0;
    const resultContent = useBest
      ? (finalState.bestDraft ?? finalState.draftContent)
      : finalState.draftContent;
    const resultAts = useBest
      ? (finalState.bestAtsScore ?? finalState.atsScore ?? 0)
      : (finalState.atsScore ?? 0);
    const resultHuman = useBest
      ? (finalState.bestHumanScore ?? finalState.humanScore ?? 0)
      : (finalState.humanScore ?? 0);
    const resultIterations = useBest
      ? (finalState.bestIteration ?? finalState.iteration ?? 1)
      : (finalState.iteration ?? 1);

    onEvent({
      type: "done",
      summary: `Generated with ATS: ${resultAts}%, Human: ${resultHuman}% in ${resultIterations} iteration(s)`,
    });

    // Persist result to SQLite
    const db = await getDb();
    const table = documentType === "resume" ? "adapted_resumes" : "cover_letters";
    await db.execute(
      `INSERT INTO ${table} (job_id, content, ats_score, human_score, iterations, generated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, datetime('now'), datetime('now'))
       ON CONFLICT(job_id) DO UPDATE SET
         content = excluded.content,
         ats_score = excluded.ats_score,
         human_score = excluded.human_score,
         iterations = excluded.iterations,
         updated_at = excluded.updated_at`,
      [jobId, resultContent, resultAts, resultHuman, resultIterations],
    );

    return {
      draftContent: resultContent ?? "",
      atsScore: resultAts,
      humanScore: resultHuman,
      iterations: resultIterations,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onEvent({ type: "error", message });
    throw err;
  }
}
