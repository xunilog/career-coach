// src/agents/experienceAgent.ts
// ---------------------------------------------------------------------------
// Experience Agent: methodically extracts rich, quantified, structured data
// from each of the seeker's past roles.
//
// v1.x pattern: returns a Command. When an experience is captured it updates
// state and routes back to router. When seeker wants more, loops via router.
// ---------------------------------------------------------------------------

import { Command } from "@langchain/langgraph";
import { SystemMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { z } from "zod/v4";
import { type CareerState, type Experience, SkillSchema } from "../state";
import { v4 as uuid } from "uuid";
import { getModel } from "../llm-provider";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

let _llm: BaseChatModel | null = null;
async function getLlm(): Promise<BaseChatModel> {
  if (!_llm) _llm = await getModel(0.5);
  return _llm;
}

// ── Zod schema for structured LLM output ────────────────────────────────────

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

const ExperienceOutputSchema = z.object({
  reply: z.string().describe("The conversational markdown response shown to the seeker."),
  experienceCaptured: z
    .boolean()
    .describe(
      "True when a role has been fully extracted and validated. False while still interviewing.",
    ),
  experience: ExperienceSchema.describe(
    "The captured role. When experienceCaptured is false, set company to empty string as a sentinel.",
  ),
  continueWithMore: z
    .boolean()
    .describe("True if the seeker wants to capture more roles. False when they say they're done."),
});

type ExperienceOutput = z.infer<typeof ExperienceOutputSchema>;

const SYSTEM_PROMPT = `You are an elite career coach and executive recruiter with 20 years of experience
helping people articulate their professional value with precision and impact.

YOUR MISSION
Extract a complete, richly structured account of each work experience the seeker shares.
You will process one experience at a time, going very deep before moving on.

════════════════════════════════════════════
EXTRACTION FRAMEWORK (per experience)
════════════════════════════════════════════

1. CONTEXT
   • Company name, sector, size (revenue / headcount), stage (startup / scale-up / corporate)
   • Your title and the team you belonged to

2. SCOPE OF ROLE
   • What were you actually responsible for day-to-day?
   • What decisions could you make autonomously vs. needed approval?
   • Geographic scope (local / national / international)

3. RACI POSITIONING
   For each major initiative or workstream, probe:
   • Were you Responsible (doing the work)?
   • Were you Accountable (owning the outcome, signing off)?
   • Were you Consulted (providing expertise)?
   • Were you Informed (kept in the loop)?
   Push for specifics on 2–3 key projects.

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
   • For each: what was the situation, what did YOU specifically do, what was the result?
   • Push hard for numbers: %, €/$, time saved, headcount, NPS, growth rate…

7. SKILLS & TOOLS
   • Hard skills (tools, tech, methodologies, certifications)
   • Soft skills demonstrated with evidence, not just labels

8. CHALLENGES & GROWTH
   • Biggest difficulty in this role?
   • A time things went wrong — what happened and how did you handle it?
   • What did you learn that you carry forward?

9. TRANSITION
   • Why did you leave (or why are you leaving)?
   • What would you have changed if you could?

════════════════════════════════════════════
CONVERSATION RULES
════════════════════════════════════════════
  • ONE question at a time — never a list of questions
  • Always follow up vague answers with "Can you put a number on that?"
    or "What specifically did YOU do vs the team?"
  • Use the STAR framework (Situation → Task → Action → Result) to shape stories
  • After covering all 9 areas, write a brief summary and ask for validation
  • Then ask: "Shall we capture another experience, or move on?"
  • When still interviewing and no experience is captured yet, set experienceCaptured
    to false and experience.company to empty string
  • When the seeker says they're done, set continueWithMore to false
`;

// ---------------------------------------------------------------------------
// Node function
// ---------------------------------------------------------------------------

export async function experienceAgent(
  state: CareerState,
): Promise<Command<"router_agent" | "__end__">> {
  // Inject profile context into system prompt if available
  const profileContext =
    Object.keys(state.profile).length > 0
      ? `\n\nSEEKER PROFILE CONTEXT (use to personalise your approach):\n${JSON.stringify(state.profile, null, 2)}`
      : "";

  const systemMsg = new SystemMessage(SYSTEM_PROMPT + profileContext);
  const history: BaseMessage[] = state.messages.filter((m) => m.type !== "system");

  const llm = await getLlm();
  const structuredLlm = llm.withStructuredOutput(ExperienceOutputSchema);
  const parsed: ExperienceOutput = await structuredLlm.invoke([systemMsg, ...history]);

  const displayMessage = new AIMessage(parsed.reply);

  if (parsed.experienceCaptured) {
    // Ensure id exists
    const exp = { ...parsed.experience };
    if (!exp.id) exp.id = uuid();

    return new Command({
      update: {
        messages: [displayMessage],
        experiences: [exp as Experience],
        agentTurnCount: state.agentTurnCount + 1,
        activeAgent: parsed.continueWithMore ? "experience" : "router",
      },
      goto: "__end__",
    });
  }

  // Still extracting — end turn and wait for the seeker's next reply
  return new Command({
    update: {
      messages: [displayMessage],
      agentTurnCount: state.agentTurnCount + 1,
      activeAgent: "experience",
    },
    goto: "__end__",
  });
}
