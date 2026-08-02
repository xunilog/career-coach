// src/shared/agents/resumeChatAgent.ts
// ---------------------------------------------------------------------------
// Resume Chat Agent — uses createAgent with read_state / write_state tools.
// Resume data accumulates in a mutable closure. The agent helps the seeker
// build a complete reference resume (not tailored to a specific job).
//
// This replaces the old toolStrategy(ResumeOutputSchema) pattern which asked
// for a job description first and tailored the resume — that logic now
// belongs in the job-detail / search zone.
// ---------------------------------------------------------------------------

import { createAgent } from "langchain";
import { SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { getModel } from "../llm-provider";
import { ResumeDataSchema } from "../state";
import type { ResumeData } from "../state";

// ── System prompt for reference resume building ────────────────────────────

const SYSTEM_PROMPT = `You are an expert resume writer and career coach. Your mission is to help the
seeker build a complete, polished REFERENCE resume — a comprehensive document
that captures everything they bring to the table. This is NOT tailored to any
specific job listing. Think of it as a kitchen-sink resume that the seeker
will later adapt for individual roles.

════════════════════════════════════════════
YOUR PROCESS
════════════════════════════════════════════

STEP 1 — PERSONAL INFORMATION
  Collect and verify:
  • Full name (first + last)
  • Phone number
  • Email address
  • LinkedIn profile URL
  • Other relevant networks (GitHub, portfolio, etc.)
  • Nationality and country of residence

STEP 2 — PROFESSIONAL HIGHLIGHTS
  • Professional title / headline (how they want to be known)
  • Banner key highlights — one punchy line that captures their value proposition
  (e.g., "10 years in B2B SaaS, launched 3 products from 0 to $10M ARR")

STEP 3 — KEY SKILLS
  • Hard skills (tools, technologies, methodologies, certifications)
  • Soft skills with evidence
  • Domain expertise and industry knowledge
  • Languages spoken
  Group by category and capture ALL skills — don't filter for any specific job.
  This is the complete inventory.

STEP 4 — EDUCATION
  For each degree or certification:
  • Institution name
  • Degree obtained
  • Field of study
  • Start and end dates (year is sufficient)
  Cover all formal education, certifications, and significant training.

STEP 5 — LANGUAGES
  • Each language the seeker speaks
  • Proficiency level: native, fluent, advanced, intermediate, or basic

════════════════════════════════════════════
EXPERIENCE — HANDLED SEPARATELY
════════════════════════════════════════════
Work experience is managed on a dedicated page. If the seeker asks about
work experience, guide them to the Experience page — you don't capture it here.
Your focus is on the sections above ONLY.

════════════════════════════════════════════
HOW TO RUN THE SESSION
════════════════════════════════════════════
  1. Start EVERY turn by calling read_state to see what's already captured
  2. Begin with a warm introduction and ask which section they'd like to
     work on first
  3. ONE section at a time — go deep before moving on
  4. ONE question at a time — never a list of questions
  5. Call write_state after EVERY meaningful discovery — don't wait
  6. When a section is complete, summarize what was captured and move on
  7. When all sections are covered, review the full reference resume
  8. Ask if anything is missing before finalizing

WRITING RULES
  • Ask one question at a time
  • Use the seeker's exact words when capturing data
  • Be encouraging and practical — this is a collaborative process
  • The conversation text is shown directly to the seeker — no JSON,
    no structured output, just warm coaching language

TOOLS
  • read_state — call FIRST each turn. Returns all currently captured
    resume data.
  • write_state — call after every meaningful discovery. Extracts resume
    data from the FULL conversation and saves it. Returns the complete
    resume data snapshot.

CRITICAL — YOU MUST USE TOOLS
  • EVERY turn MUST start by calling read_state. This is MANDATORY.
  • After EVERY meaningful discovery, you MUST call write_state immediately.
  • You CANNOT save data just by talking about it — you must call write_state.
  • If you say "saved" or "stored" without calling write_state, nothing happens.
  • NEVER claim you've saved data unless the conversation contains a ToolMessage
    confirming the write_state result.`;

// ── Factory ────────────────────────────────────────────────────────────────

export async function createResumeChatAgent(checkpointer?: BaseCheckpointSaver) {
  const llm = await getModel(0.5, undefined, undefined, true);

  // Mutable closure variable — seeded before each invoke, read after.
  const accumulatedResume: { value: ResumeData } = {
    value: {
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
    },
  };

  // Conversation messages — set before each invoke, used by write_state tool.
  const conversationMessages: { value: BaseMessage[] } = { value: [] };

  // Dedup: skip extraction when conversation hasn't changed since last call
  let lastExtractionHash = "";

  // ── read_state tool ──────────────────────────────────────────────────

  const readStateTool = tool(
    async () => {
      return JSON.stringify(accumulatedResume.value, null, 2);
    },
    {
      name: "read_state",
      description:
        "Read all currently captured resume data. " +
        "Call this at the START of every turn to see what sections " +
        "have already been filled (personal info, highlights, skills, " +
        "education, languages).",
      schema: z.object({}),
    },
  );

  // ── write_state tool ─────────────────────────────────────────────────

  const extractionLlm = await getModel(0, undefined, "lite");
  const structuredLlm = extractionLlm.withStructuredOutput(ResumeDataSchema);

  const writeStateTool = tool(
    async (_args, _config) => {
      const history: BaseMessage[] = conversationMessages.value.filter((m) => m.type !== "system");

      // Guard: skip extraction when no conversation content
      if (history.length === 0) {
        return JSON.stringify(accumulatedResume.value, null, 2);
      }

      // Dedup: skip if conversation unchanged since last extraction
      const hashKey = history
        .map((m) => (typeof m.content === "string" ? m.content : ""))
        .join("|");
      if (hashKey === lastExtractionHash) {
        return JSON.stringify(accumulatedResume.value, null, 2);
      }
      lastExtractionHash = hashKey;

      const currentResume = JSON.stringify(accumulatedResume.value, null, 2);
      const extractionPrompt = `You are extracting structured resume data from a coaching conversation.
Analyze the ENTIRE conversation below and extract ALL resume fields you can identify.

For each field, only fill in what is explicitly mentioned in the conversation.
Use empty strings for unknown text fields and empty arrays for unknown list fields.

PERSONAL INFO: Extract first/last name, phone, email, LinkedIn URL, other networks,
nationality, and country of residence.

HIGHLIGHTS: Extract professional title and a banner/key highlights oneliner.

KEY SKILLS: Extract ALL skills mentioned — hard skills, soft skills, tools, methodologies,
certifications, and domain expertise. Assign each skill the most appropriate category:
technical, tool, methodology, soft, certification, or domain. Be comprehensive (this is a reference resume).

EDUCATION: Extract each degree, certification, or training program with institution,
degree, field of study, and dates. Use year-only dates (e.g., "2012") when possible.

LANGUAGES: Extract each language and proficiency level (native, fluent, advanced,
intermediate, basic).

IMPORTANT: Do NOT extract work experience — that's handled on a separate page.

Currently captured resume (for context — merge new findings):
${currentResume}

Extract ALL resume fields from the conversation below.`;

      const extracted = await structuredLlm.invoke([
        new SystemMessage(extractionPrompt),
        ...history,
      ]);

      // Merge: non-empty values from extraction overwrite accumulated
      const merged = { ...accumulatedResume.value };

      if (extracted.firstName) merged.firstName = extracted.firstName;
      if (extracted.lastName) merged.lastName = extracted.lastName;
      if (extracted.phone) merged.phone = extracted.phone;
      if (extracted.email) merged.email = extracted.email;
      if (extracted.linkedin) merged.linkedin = extracted.linkedin;
      if (extracted.otherNetworks) merged.otherNetworks = extracted.otherNetworks;
      if (extracted.nationality) merged.nationality = extracted.nationality;
      if (extracted.country) merged.country = extracted.country;
      if (extracted.title) merged.title = extracted.title;
      if (extracted.bannerHighlights) merged.bannerHighlights = extracted.bannerHighlights;
      if (extracted.keySkills.length > 0) merged.keySkills = extracted.keySkills;
      if (extracted.education.length > 0) merged.education = extracted.education;
      if (extracted.languages.length > 0) merged.languages = extracted.languages;

      accumulatedResume.value = merged;

      return JSON.stringify(accumulatedResume.value, null, 2);
    },
    {
      name: "write_state",
      description:
        "Extract resume data from the FULL conversation and save it. " +
        "Call this after every meaningful discovery (name, email, phone, " +
        "title, skills, education, languages, etc.). " +
        "Returns the complete resume data snapshot so you can see what's " +
        "been captured and what sections still need work. " +
        "You MUST call this to persist data — talking about saving does nothing.",
      schema: z.object({}),
    },
  );

  const agent = createAgent({
    model: llm,
    tools: [readStateTool, writeStateTool],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const emptyResume: ResumeData = {
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

  return {
    agent,
    /** Seed accumulated resume before invoking (e.g., from SQLite). */
    seedResume: (data: ResumeData) => {
      accumulatedResume.value = { ...data };
    },
    /** Set conversation messages before invoke so write_state can access them. */
    setConversationMessages: (msgs: BaseMessage[]) => {
      conversationMessages.value = msgs;
    },
    /** Extract accumulated resume after invoking. */
    getResume: (): ResumeData => ({ ...accumulatedResume.value }),
    /** Reset accumulated resume for new conversations. */
    reset: () => {
      accumulatedResume.value = { ...emptyResume };
    },
  };
}
