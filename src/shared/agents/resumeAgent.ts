// src/agents/resumeAgent.ts
// ---------------------------------------------------------------------------
// Resume Agent: builds a tailored, ATS-optimised resume for a specific job.
//
// v1.x pattern: returns a Command. When the resume is finalised it updates
// state and routes back to router. While iterating, loops via router.
// ---------------------------------------------------------------------------

import { Command } from "@langchain/langgraph";
import { SystemMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { z } from "zod/v4";
import { type CareerState } from "../state";
import { getModel } from "../llm-provider";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

let _llm: BaseChatModel | null = null;
async function getLlm(): Promise<BaseChatModel> {
  if (!_llm) _llm = await getModel(0.4);
  return _llm;
}

// ── Zod schema for structured LLM output ────────────────────────────────────

const ResumeOutputSchema = z.object({
  reply: z.string().describe("The conversational markdown response shown to the seeker."),
  resumeComplete: z.boolean().describe("True when the resume is final and approved."),
  resumeMarkdown: z
    .string()
    .nullable()
    .describe("The full resume in Markdown. Null when still drafting."),
  targetJob: z.string().nullable().describe("The target job description."),
  tailoringNotes: z.string().nullable().describe("Key matches and framing decisions."),
});

type ResumeOutput = z.infer<typeof ResumeOutputSchema>;

const SYSTEM_PROMPT = `You are a world-class CV writer and talent strategist.
You craft resumes that are simultaneously ATS-proof and compelling to human readers.

════════════════════════════════════════════
YOUR PROCESS
════════════════════════════════════════════

STEP 1 — GET THE JOB TARGET
  If no job description has been provided, ask the seeker to:
  a) Paste the full job description, OR
  b) Describe the role (title, company, key responsibilities)

STEP 2 — ANALYSE THE JD
  Identify:
  • Must-have requirements (hard skills, qualifications, experience level)
  • Nice-to-have requirements
  • Keywords that will appear in ATS (track exact phrasing)
  • Culture and values signals (what kind of person do they want?)
  • Seniority level and leadership expectations

STEP 3 — MAP SEEKER TO JD
  Using the seeker's profile and experiences, identify:
  • Strong matches (lead with these)
  • Partial matches (frame carefully)
  • Gaps (acknowledge honestly; suggest how to address)

STEP 4 — DRAFT THE RESUME
  Structure:
  ┌─────────────────────────────────────┐
  │ HEADER         Name, contact, LinkedIn, location
  │ HEADLINE       One punchy line tailored to the role
  │ SUMMARY        3–4 lines: who you are, your value prop, fit signal
  │ CORE SKILLS    ATS keyword grid — only real, evidenced skills
  │ EXPERIENCE     Reverse-chron, each role:
  │                  Company | Title | Dates | Location
  │                  2-line context (company + your scope)
  │                  3–5 bullet achievements (STAR, quantified)
  │ EDUCATION      Degrees, certs — only what's relevant
  │ ADDITIONAL     Languages, publications, boards — if relevant
  └─────────────────────────────────────┘

WRITING RULES
  • Every bullet starts with a strong past-tense action verb
  • Every achievement is quantified (%, €/$, headcount, time, rank)
  • Mirror the JD's language exactly for ATS (but naturally)
  • No "responsible for" — only outcomes and impact
  • No pronouns ("I", "my") — resume voice is implicit first-person
  • One page for <10 years experience; two pages for senior roles
  • Tailored headline and summary per application — never generic

STEP 5 — ITERATE
  Present the draft and ask:
  • "Does this headline capture how you want to be positioned?"
  • "Are there achievements you feel are missing or understated?"
  • "Any experience you'd like to de-emphasise for this role?"

STEP 6 — FINALISE
  When the seeker approves, set resumeComplete to true and include the full
  resume as resumeMarkdown, plus targetJob and tailoringNotes.
`;

// ---------------------------------------------------------------------------
// Node function
// ---------------------------------------------------------------------------

export async function resumeAgent(
  state: CareerState,
): Promise<Command<"router_agent" | "__end__">> {
  // Build rich context from accumulated state
  const contextSections: string[] = [];

  if (Object.keys(state.profile).length > 0) {
    contextSections.push(`SEEKER PROFILE:\n${JSON.stringify(state.profile, null, 2)}`);
  }

  if (state.experiences.length > 0) {
    contextSections.push(
      `EXPERIENCES (${state.experiences.length} captured):\n${JSON.stringify(state.experiences, null, 2)}`,
    );
  }

  if (state.targetJob) {
    contextSections.push(`CURRENT TARGET JOB:\n${state.targetJob}`);
  }

  if (state.resumeDraft) {
    contextSections.push(`CURRENT DRAFT:\n${state.resumeDraft}`);
  }

  const contextBlock =
    contextSections.length > 0
      ? `\n\n════════════════════════════════════════════\nSEEKER DATA AVAILABLE TO YOU\n════════════════════════════════════════════\n${contextSections.join("\n\n")}`
      : "";

  const systemMsg = new SystemMessage(SYSTEM_PROMPT + contextBlock);
  const history: BaseMessage[] = state.messages.filter((m) => m.type !== "system");

  const llm = await getLlm();
  const structuredLlm = llm.withStructuredOutput(ResumeOutputSchema);
  const parsed: ResumeOutput = await structuredLlm.invoke([systemMsg, ...history]);

  const displayMessage = new AIMessage(parsed.reply);

  if (parsed.resumeComplete) {
    // Resume complete — end turn; router picks up on next message
    return new Command({
      update: {
        messages: [displayMessage],
        resumeDraft: parsed.resumeMarkdown ?? state.resumeDraft,
        targetJob: parsed.targetJob ?? state.targetJob,
        agentTurnCount: state.agentTurnCount + 1,
        activeAgent: "router",
      },
      goto: "__end__",
    });
  }

  // Still iterating — end turn and wait for the seeker's next reply
  return new Command({
    update: {
      messages: [displayMessage],
      resumeDraft: parsed.resumeMarkdown ?? undefined,
      agentTurnCount: state.agentTurnCount + 1,
      activeAgent: "resume",
    },
    goto: "__end__",
  });
}
