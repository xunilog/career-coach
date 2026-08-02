// src/shared/agents/profileChatAgent.ts
// ---------------------------------------------------------------------------
// Profile Chat Agent — uses createReactAgent (LangGraph prebuilt) instead
// of the manual tool-calling loop. The agent handles the read_state /
// write_state tool loop automatically. Profile data accumulates in a
// mutable closure variable that callers seed before invocation and
// extract after.
//
// Replaces the old profileAgent.ts which was a LangGraph node function.
// ---------------------------------------------------------------------------

import { createAgent } from "langchain";
import { SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { type ColorProfile, ColorProfileSchema } from "../state";
import { getModel } from "../llm-provider";

// ── System prompt (same as original profileAgent) ─────────────────────────

const SYSTEM_PROMPT = `You are an expert career coach specialising in the Colors personality method
(Red, Yellow, Green, Blue) — also drawing on DISC, Holland Codes, and motivational interviewing.

════════════════════════════════════════════
COLORS CHEAT SHEET
════════════════════════════════════════════
🔴 RED   — Results-driven, decisive, competitive, loves control and challenge.
           Motivated by power, achievement, winning. Dislikes slow pace or routine.

🟡 YELLOW — Enthusiastic, creative, social, optimistic. Motivated by recognition,
            fun, collaboration. Dislikes excessive structure or negative feedback.

🟢 GREEN  — Steady, empathetic, loyal, harmonious. Motivated by belonging, stability,
            helping others. Dislikes conflict or sudden change.

🔵 BLUE   — Analytical, precise, systematic, quality-focused. Motivated by accuracy,
            expertise, process. Dislikes ambiguity or poor preparation.

Most people blend two dominant colors.
════════════════════════════════════════════

YOUR GOAL
Build a rich, honest profile covering:
  • Dominant + secondary color with evidence from answers
  • DISC mapping (D / I / S / C)
  • Career drivers (e.g. autonomy, impact, security, recognition, growth, variety)
  • Work style preferences (collaborative vs solo, structured vs fluid, big-picture vs detail…)
  • Core values and non-negotiables
  • Risk appetite (level + detailed explanation in riskProfileDetails) and change tolerance

HOW TO RUN THE SESSION
  1. Start EVERY turn by calling read_state to see what's already captured
  2. Start warm and open ("What energises you at work?", "Describe your best day on the job")
  3. Probe every answer with one sharp follow-up ("Can you give me a concrete example?",
     "What specifically made that feel good?", "What would have made it even better?")
  4. After 3–4 exchanges, surface a tentative hypothesis and test it
     ("I'm noticing a Red/Blue pattern — does that resonate?")
  5. CALL write_state after EVERY meaningful discovery — don't wait until the end.
     write_state returns the full current profile so you know what's been captured.
  6. After ~8 exchanges, write a reflective summary, present it to the seeker, and ask
     "Does this feel accurate?"
  7. When the seeker confirms the summary is accurate — even a simple "yes" or
     "sounds right" — call write_state one final time to ensure everything is captured.

COMPLETION
  • The profile is complete when dominantColor is NOT "unknown"
  • After 12+ exchanges even without explicit validation, the profile is complete
  • When you have clear evidence for dominant + secondary color, the profile is complete

TOOLS
  • read_state — call this FIRST each turn. Returns the current accumulated profile.
  • write_state — call this after every meaningful discovery. Extracts profile data
    from the FULL conversation and saves it. Returns the merged profile so you
    can see what's been captured and what's still needed.

CRITICAL — YOU MUST USE TOOLS
  • EVERY turn MUST start by calling read_state. This is MANDATORY, not optional.
  • After EVERY meaningful discovery, you MUST call write_state immediately.
  • You CANNOT save data just by talking about it — you must call write_state.
  • If you say "saved" or "stored" without calling write_state, nothing happens.
  • WHENEVER the seeker asks you to "save", "update", "write", or "store"
    anything, you MUST call write_state BEFORE typing your text response.
    The write_state tool call MUST appear in your tool_calls array.
  • NEVER claim you've saved or updated the profile unless the conversation
    actually contains a ToolMessage confirming the write_state result.
  • Example turn: read_state → [ask question] → (user responds) →
    read_state → write_state → [confirm what was captured in text]

RULES
  • Never ask more than ONE question at a time
  • Never rush — depth beats speed
  • Use the seeker's exact words back at them
  • If they give a vague answer, gently push for specifics
  • Always call write_state to save discoveries — don't hoard them in your head
  • The conversation text you write is shown directly to the seeker — no JSON,
    no structured output, just warm, natural coaching language with emoji.
`;

// ── Factory ────────────────────────────────────────────────────────────────

export async function createProfileChatAgent(checkpointer?: BaseCheckpointSaver) {
  const llm = await getModel(0.7, undefined, undefined, true);

  // Mutable closure variable — seeded before each invoke, read after.
  const accumulatedProfile: { value: Partial<ColorProfile> } = { value: {} };

  // Conversation messages — set before each invoke, used by write_state tool.
  const conversationMessages: { value: BaseMessage[] } = { value: [] };

  // Dedup: skip extraction when conversation hasn't changed since last call
  let lastExtractionHash = "";

  // ── read_state tool ──────────────────────────────────────────────────

  const readStateTool = tool(
    async () => {
      return JSON.stringify(accumulatedProfile.value, null, 2);
    },
    {
      name: "read_state",
      description:
        "Read the current accumulated profile state. " +
        "Call this at the START of every turn to see what has already been " +
        "captured (dominantColor, secondaryColor, careerDrivers, " +
        "workStylePreferences, values, riskAppetite, etc.). " +
        "Fields that are missing or have value 'unknown' are not yet captured.",
      schema: z.object({}),
    },
  );

  // ── write_state tool ─────────────────────────────────────────────────

  const extractionLlm = await getModel(0, undefined, "lite");
  const structuredLlm = extractionLlm.withStructuredOutput(ColorProfileSchema);

  const writeStateTool = tool(
    async (_args, _config) => {
      // Get conversation messages from the closure (set before invoke).
      // createAgent does NOT pass messages in config.configurable — we store
      // them in a mutable closure so the tool can access them.
      const history: BaseMessage[] = conversationMessages.value.filter((m) => m.type !== "system");

      // Guard: skip extraction when no conversation content is available.
      // Gemini lite models reject requests with empty contents.
      if (history.length === 0) {
        return JSON.stringify(accumulatedProfile.value, null, 2);
      }

      // Dedup: skip if conversation unchanged since last extraction
      const hashKey = history
        .map((m) => (typeof m.content === "string" ? m.content : ""))
        .join("|");
      if (hashKey === lastExtractionHash) {
        return JSON.stringify(accumulatedProfile.value, null, 2);
      }
      lastExtractionHash = hashKey;

      const currentProfile = JSON.stringify(accumulatedProfile.value, null, 2);
      const extractionPrompt = `You are extracting a career personality profile from a coaching conversation.
Analyze the ENTIRE conversation below and extract ALL profile fields you can identify.

If you cannot determine a field with confidence, use the sentinel value "unknown" for colors/risk
or an empty array for lists, or empty string for text fields.

Current accumulated profile (merge your findings into this):
${currentProfile}

Return the FULL merged profile — keep existing values unless the conversation
provides stronger evidence for something different.`;

      const extracted = await structuredLlm.invoke([
        new SystemMessage(extractionPrompt),
        ...history,
      ]);

      // Merge: new extraction wins over accumulated for non-sentinel values
      const merged: ColorProfile = {
        dominantColor:
          extracted.dominantColor !== "unknown"
            ? extracted.dominantColor
            : ((accumulatedProfile.value.dominantColor as ColorProfile["dominantColor"]) ??
              "unknown"),
        secondaryColor: extracted.secondaryColor ?? accumulatedProfile.value.secondaryColor,
        discProfile: extracted.discProfile ?? accumulatedProfile.value.discProfile,
        careerDrivers:
          extracted.careerDrivers.length > 0
            ? extracted.careerDrivers
            : (accumulatedProfile.value.careerDrivers ?? []),
        workStylePreferences:
          extracted.workStylePreferences.length > 0
            ? extracted.workStylePreferences
            : (accumulatedProfile.value.workStylePreferences ?? []),
        values:
          extracted.values.length > 0 ? extracted.values : (accumulatedProfile.value.values ?? []),
        riskAppetite:
          extracted.riskAppetite !== "unknown"
            ? extracted.riskAppetite
            : ((accumulatedProfile.value.riskAppetite as ColorProfile["riskAppetite"]) ??
              "unknown"),
        riskProfileDetails:
          extracted.riskProfileDetails || accumulatedProfile.value.riskProfileDetails || "",
        changeToleranceNotes:
          extracted.changeToleranceNotes || accumulatedProfile.value.changeToleranceNotes || "",
        rawInsights: extracted.rawInsights || accumulatedProfile.value.rawInsights || "",
      };

      accumulatedProfile.value = merged;
      return JSON.stringify(merged, null, 2);
    },
    {
      name: "write_state",
      description:
        "Extract profile data from the FULL conversation and save it. " +
        "Call this after every meaningful discovery. Returns the merged profile " +
        "so you can see what's been captured and what still needs work. " +
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
    /** Seed the accumulated profile before invoking (e.g., from SQLite). */
    seedProfile: (p: Partial<ColorProfile>) => {
      accumulatedProfile.value = { ...p };
    },
    /** Set conversation messages before invoke so write_state can access them. */
    setConversationMessages: (msgs: BaseMessage[]) => {
      conversationMessages.value = msgs;
    },
    /** Extract the accumulated profile after invoking. */
    getProfile: (): Partial<ColorProfile> => ({ ...accumulatedProfile.value }),
    /** Reset the accumulated profile for new conversations. */
    reset: () => {
      accumulatedProfile.value = {};
    },
  };
}
