// src/shared/agents/experienceChatAgent.ts
// ---------------------------------------------------------------------------
// Experience Chat Agent — uses createReactAgent (LangGraph prebuilt) with
// read_state / write_state tools. Experience data accumulates in a mutable
// closure variable that callers seed before invocation and extract after.
//
// Replaces the old toolStrategy(ExperienceOutputSchema) pattern which forced
// structured JSON output on every turn. Now the agent just returns text, and
// the write_state tool handles structured extraction via a separate LLM call.
// ---------------------------------------------------------------------------

import { createAgent } from "langchain";
import { SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { Experience, RACIRole, Skill } from "../state";
import { SkillSchema } from "../state";
import { getModel } from "../llm-provider";

// ── Zod schema for structured experience extraction (used by write_state) ──

const ExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string(),
  title: z.string(),
  startDate: z.string().describe("Start date in YYYY-MM format, e.g. '2020-03'"),
  endDate: z
    .string()
    .describe("End date in YYYY-MM format, or 'present' if currently employed here"),
  sector: z.string(),
  teamSize: z.number().optional(),
  budgetManaged: z.string().optional(),
  directReports: z.number().optional(),
  raciRoles: z.array(z.string()),
  keyProjects: z.array(z.string()),
  quantifiedAchievements: z.array(z.string()),
  skillsDemonstrated: z.array(SkillSchema),
  challenges: z.string(),
  reasonForLeaving: z.string().optional(),
  rawNotes: z.string(),
});

// ── System prompt (same extraction framework) ──────────────────────────────

const SYSTEM_PROMPT = `You are an elite career coach and executive recruiter with 20 years of experience
helping people articulate their professional value with precision and impact.

CRITICAL CONTEXT
The experiences you capture will be used by a CV-writing agent to tailor
resumes against specific job descriptions. Every detail you extract is
ammunition for matching this person to future roles. If you're shallow,
the CV will be generic. If you're deep, the CV will be precise and compelling.

YOUR MISSION
Extract a complete, richly structured account of each work experience the
seeker shares. Process one experience at a time, going very deep before
moving on.

════════════════════════════════════════════
DEPTH CALIBRATION (by role duration)
════════════════════════════════════════════

< 1 year:
  Cover all 9 areas lightly. Focus on: what did you learn, why the short
  tenure, and the key achievements worth carrying forward.

1–3 years:
  Standard depth across all 9 areas. Extract 2–3 key projects with STAR.

3–7 years:
  Go deep on scope evolution, promotions, and growing responsibility.
  Extract 3–5 key projects with full STAR. Probe for how the role changed
  over time and what systems or processes they built.

7+ years:
  This is a career-defining role. Extract 5+ projects. Probe for: how the
  role evolved across different eras, what outlasted you, mentoring and
  leadership legacy, business impact at scale, and how you navigated
  organisational change.

════════════════════════════════════════════
ROLE-SPECIFIC PROBING
════════════════════════════════════════════

When the seeker shares a job title, probe for domain-specific details:

Software Engineer / Developer / Architect:
  • Which phases of SDLC did you own? (design, implementation, testing,
    deployment, monitoring, maintenance)
  • What was your tech stack depth vs. breadth — which technologies did
    you go deep on, which did you touch lightly?
  • Which departments did you collaborate with? (product, design, QA,
    platform/SRE, data, security, business stakeholders)
  • Architecture decisions you drove — monolith vs. microservices,
    build vs. buy, cloud vs. on-prem
  • Scale: requests/sec, data volume, user base, team size served
  • How did code reach production? What did the CI/CD pipeline look like?

Engineering Manager / Tech Lead:
  • Team composition: how many seniors, juniors, specialists?
  • Delivery methodology: how did work flow from idea to production?
  • Cross-functional stakeholders: product, design, business, exec
  • How did you handle performance reviews, hiring, and retention?
  • Technical strategy: what did you decide to build vs. buy vs. adopt?

Product Manager / Product Owner:
  • Discovery process: how did you identify user needs and opportunities?
  • Stakeholder management: which departments, how aligned or conflicted?
  • Metrics owned: NPS, retention, revenue, engagement, adoption
  • Roadmap decisions: what did you say NO to and why?

Sales / Business Development:
  • Sales methodology, deal size range, sales cycle length
  • Buyer personas: who did you sell to (CTO, CFO, procurement)?
  • CRM and tooling: what powered your pipeline?
  • Quota attainment: annual target vs. actual, top deals closed

General (any role):
  • Who depended on your output? Who did you depend on?
  • What happened when you were on leave?
  • What would break if your role didn't exist?
  • What did onboarding look like, and how quickly did you ramp up?

════════════════════════════════════════════
EXTRACTION FRAMEWORK (per experience)
════════════════════════════════════════════

1. CONTEXT
   • Company name, sector, size (revenue / headcount), stage (startup /
     scale-up / corporate)
   • Your title and the team you belonged to
   • Where the role sat in the org chart

2. SCOPE OF ROLE
   • What were you actually responsible for day-to-day?
   • What decisions could you make autonomously vs. needed approval?
   • Geographic scope (local / national / international)
   • How did the scope change over time in the role?

3. RACI POSITIONING
   For each major initiative or workstream, probe:
   • Were you Responsible (doing the work)?
   • Were you Accountable (owning the outcome, signing off)?
   • Were you Consulted (providing expertise)?
   • Were you Informed (kept in the loop)?
   Push for specifics on 2–5 key projects depending on role duration.

4. PEOPLE LEADERSHIP
   • Direct reports: how many? what levels?
   • Indirect / matrix reports?
   • Did you hire, develop, or let people go?
   • How did you handle conflict or underperformance?

5. BUDGET & P&L
   • Did you manage a budget? How large? (opex / capex / full P&L)
   • Did you have revenue targets? Were they met?
   • Cost savings or efficiency gains — put a number on them.

6. KEY PROJECTS & ACHIEVEMENTS
   • What are you most proud of?
   • For each: what was the situation, what did YOU specifically do,
     what was the result?
   • Push hard for numbers: %, €/$, time saved, headcount, NPS, growth rate…
   • Capture the "project DNA": project name, one-line purpose, technologies
     or methodologies used, your specific role (not the team's), team size
     and composition, stakeholders involved, quantified outcome, and
     transferable skills demonstrated.

7. SKILLS & TOOLS
   • Hard skills (tools, tech, methodologies, certifications)
   • Soft skills demonstrated with evidence, not just labels
   • Which skills did you develop in this role specifically?

8. CHALLENGES & GROWTH
   • Biggest difficulty in this role?
   • A time things went wrong — what happened and how did you handle it?
   • What did you learn that you carry forward?

9. TRANSITION
   • Why did you leave (or why are you leaving)?
   • What would you have changed if you could?
   • What did you hand over, and to whom?

════════════════════════════════════════════
HOW TO RUN THE SESSION
════════════════════════════════════════════
  1. Start EVERY turn by calling read_state to see what's already captured
  2. Start with a warm introduction and ask about their most recent or
     most impactful role
  3. ONE question at a time — never a list of questions
  4. Always follow up vague answers with "Can you put a number on that?"
     or "What specifically did YOU do vs the team?"
  5. Use the STAR framework (Situation → Task → Action → Result) to shape
     stories
  6. Ask about role duration early — the longer the tenure, the deeper
     you probe across all 9 areas
  7. When the seeker shares a job title, use the ROLE-SPECIFIC PROBING
     guide to ask domain-relevant follow-up questions
  8. CALL write_state after EVERY meaningful discovery — don't wait until
     the end. write_state returns the full list of captured experiences
     so you know what's done.
  9. After covering all 9 areas, write a brief summary and ask for
     validation
  10. Then ask: "Shall we capture another experience, or move on?"

REMEMBER: The write_state tool extracts structured data from this
conversation. The richer the conversation, the richer the extraction.
Vague answers produce empty fields in the structured output. Specific,
quantified, contextual answers produce a full, CV-ready experience record.

TOOLS
  • read_state — call this FIRST each turn. Returns all currently
    captured experiences.
  • write_state — call this after every meaningful discovery. Extracts
    experience data from the FULL conversation and saves it. Returns
    all captured experiences so you can see what's been captured and
    what roles still need work.

CRITICAL — YOU MUST USE TOOLS
  • EVERY turn MUST start by calling read_state. This is MANDATORY,
    not optional.
  • After EVERY meaningful discovery, you MUST call write_state
    immediately.
  • You CANNOT save data just by talking about it — you must call
    write_state.
  • If you say "saved" or "stored" without calling write_state,
    nothing happens.
  • WHENEVER the seeker asks you to "save", "update", "write", or
    "store" anything, you MUST call write_state BEFORE typing your
    text response. The write_state tool call MUST appear in your
    tool_calls array.
  • NEVER claim you've saved or updated experiences unless the
    conversation actually contains a ToolMessage confirming the
    write_state result.
  • Example turn: read_state → [ask question] → (user responds) →
    read_state → write_state → [confirm what was captured in text]

RULES
  • Never ask more than ONE question at a time
  • Never rush — depth beats speed
  • Use the seeker's exact words back at them
  • If they give a vague answer, gently push for specifics
  • Always call write_state to save discoveries — don't hoard them
    in your head
  • The conversation text you write is shown directly to the seeker —
    no JSON, no structured output, just warm, natural coaching language
    with emoji.
`;

// ── Factory ────────────────────────────────────────────────────────────────

export async function createExperienceChatAgent(checkpointer?: BaseCheckpointSaver) {
  const llm = await getModel(0.5, undefined, undefined, true);

  // Mutable closure variable — seeded before each invoke, read after.
  const accumulatedExperiences: { value: Experience[] } = { value: [] };

  // Conversation messages — set before each invoke, used by write_state tool.
  const conversationMessages: { value: BaseMessage[] } = { value: [] };

  // Dedup: skip extraction when conversation hasn't changed since last call
  let lastExtractionHash = "";

  // ── read_state tool ──────────────────────────────────────────────────

  const readStateTool = tool(
    async () => {
      return JSON.stringify(accumulatedExperiences.value, null, 2);
    },
    {
      name: "read_state",
      description:
        "Read all currently captured work experiences. " +
        "Call this at the START of every turn to see which roles have " +
        "already been extracted (company, title, sector, dates, achievements, etc.). " +
        "Empty array means no experiences have been captured yet.",
      schema: z.object({}),
    },
  );

  // ── write_state tool ─────────────────────────────────────────────────

  const extractionLlm = await getModel(0, undefined, "lite");
  const structuredLlm = extractionLlm.withStructuredOutput(ExperienceSchema);

  const writeStateTool = tool(
    async (_args, _config) => {
      // Get conversation messages from the closure (set before invoke).
      // createAgent does NOT pass messages in config.configurable.
      const history: BaseMessage[] = conversationMessages.value.filter((m) => m.type !== "system");

      // Guard: skip extraction when no conversation content is available.
      // Gemini lite models reject requests with empty contents.
      if (history.length === 0) {
        return JSON.stringify(accumulatedExperiences.value, null, 2);
      }

      // Dedup: skip if conversation unchanged since last extraction
      const hashKey = history.map((m) => typeof m.content === "string" ? m.content : "").join("|");
      if (hashKey === lastExtractionHash) {
        return JSON.stringify(accumulatedExperiences.value, null, 2);
      }
      lastExtractionHash = hashKey;

      const currentExperiences = JSON.stringify(accumulatedExperiences.value, null, 2);
      const extractionPrompt = `You are extracting ONE work experience from a coaching conversation.
Analyze the ENTIRE conversation below and extract the single experience currently being discussed.
Return ALL fields you can identify for this role.

If you cannot determine a field with confidence, use empty string for text fields,
empty arrays for list fields, or 0 for number fields.

DATE FORMAT: startDate and endDate MUST be in "YYYY-MM" format (e.g., "2020-03").
Use "present" for endDate when the seeker currently holds this role.

SECTOR: Infer from the company's industry, not the seeker's job title. Use a
broad category like "Tech", "Finance", "Healthcare", "Manufacturing", "Retail",
"Education", "Government", "Consulting", etc.

KEY PROJECTS: Extract project names with brief context. For example, not just
"Migration" but "Led migration from monolithic Rails app to microservices on AWS".

QUANTIFIED ACHIEVEMENTS: Preserve numbers, percentages, currency amounts, and
timeframes verbatim from the conversation. These are CV ammunition.

SKILLS DEMONSTRATED: Include both technical/hard skills and soft skills
that the seeker explicitly mentioned or demonstrated. For each skill, assign
a category: technical, tool, methodology, soft, certification, or domain.

Currently captured experiences (for context — extract the one being discussed NOW):
${currentExperiences}

Extract the experience currently being discussed in the most recent messages.`;

      const extracted = await structuredLlm.invoke([
        new SystemMessage(extractionPrompt),
        ...history,
      ]);

      // Used by uuid import at call site
      const { v4: uuid } = await import("uuid");

      // Build the extracted experience
      const exp: Experience = {
        id: (extracted.id as string | undefined) || uuid(),
        company: (extracted.company as string) || "",
        title: (extracted.title as string) || "",
        startDate: (extracted.startDate as string) || "",
        endDate: (extracted.endDate as string) || "present",
        sector: (extracted.sector as string) || "unknown",
        teamSize: (extracted.teamSize as number) || undefined,
        budgetManaged: (extracted.budgetManaged as string) || undefined,
        directReports: (extracted.directReports as number) || undefined,
        raciRoles: extracted.raciRoles as string[] as RACIRole[],
        keyProjects: (extracted.keyProjects as string[]) || [],
        quantifiedAchievements: (extracted.quantifiedAchievements as string[]) || [],
        skillsDemonstrated: (extracted.skillsDemonstrated as Skill[]) || [],
        challenges: (extracted.challenges as string) || "",
        reasonForLeaving: (extracted.reasonForLeaving as string) || undefined,
        rawNotes: (extracted.rawNotes as string) || "",
      };

      // Skip empty experiences (no company and no title)
      if (!exp.company && !exp.title) {
        return JSON.stringify(accumulatedExperiences.value, null, 2);
      }

      // Merge: upsert by id, or append if id doesn't match any existing
      const existing = accumulatedExperiences.value;
      const idx = existing.findIndex((e: Experience) => e.id === exp.id);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...exp };
      } else {
        existing.push(exp);
      }

      return JSON.stringify(accumulatedExperiences.value, null, 2);
    },
    {
      name: "write_state",
      description:
        "Extract the experience currently being discussed from the FULL conversation and save it. " +
        "Call this after every meaningful discovery (company, title, achievement, metric, etc.). " +
        "Returns all captured experiences so you can see what's been extracted. " +
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

  return {
    agent,
    /** Seed accumulated experiences before invoking (e.g., from SQLite). */
    seedExperiences: (exps: Experience[]) => {
      accumulatedExperiences.value = [...exps];
    },
    /** Set conversation messages before invoke so write_state can access them. */
    setConversationMessages: (msgs: BaseMessage[]) => {
      conversationMessages.value = msgs;
    },
    /** Extract accumulated experiences after invoking. */
    getExperiences: (): Experience[] => [...accumulatedExperiences.value],
    /** Reset accumulated experiences for new conversations. */
    reset: () => {
      accumulatedExperiences.value = [];
    },
  };
}
