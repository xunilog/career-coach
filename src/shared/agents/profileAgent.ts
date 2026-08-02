// src/agents/profileAgent.ts
// ---------------------------------------------------------------------------
// Profile Agent: grills the seeker using the Colors method (+ DISC overtones)
// to build a rich career personality and motivational profile.
//
// Architecture: tool-calling loop with two tools:
//   - read_state  — returns the current accumulated profile (pure function)
//   - write_state — LLM call extracting profile from conversation, returns
//                    the full merged state so the LLM knows where it stands
//
// The LLM streams text and calls these tools progressively. State is written
// to the store on every turn, so the UI updates incrementally.
// ---------------------------------------------------------------------------

import { Command } from "@langchain/langgraph";
import { SystemMessage, AIMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import { type CareerState, type ColorProfile, ColorProfileSchema } from "../state";
import { getModel } from "../llm-provider";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

let _baseChatModel: BaseChatModel | null = null;
async function getLlm(): Promise<BaseChatModel> {
  if (!_baseChatModel) _baseChatModel = await getModel(0.7);
  return _baseChatModel;
}

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

// ---------------------------------------------------------------------------
// Tool factories — created fresh per agent invocation so they close over
// the current accumulated profile.
// ---------------------------------------------------------------------------

/**
 * Creates a read_state tool that returns the current accumulated profile
 * as a JSON string. This is a pure function (no LLM call).
 *
 * The tool closes over the given profile so the LLM can see what's already
 * been captured, avoiding re-asking about known fields.
 */
export function makeReadStateTool(profile: Partial<ColorProfile>) {
  console.log("calling read tool", profile);
  return tool(
    async () => {
      return JSON.stringify(profile, null, 2);
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
}

/**
 * Creates a write_state tool that extracts profile data from the conversation
 * using structured output (LLM call), merges it with the existing accumulated
 * profile, and returns the full merged state as JSON.
 *
 * The tool closes over the conversation history and existing profile.
 * After each call, the LLM sees the full current state so it knows what
 * still needs to be discovered.
 */
export function makeWriteStateTool(
  accumulatedProfile: Partial<ColorProfile>,
  messages: BaseMessage[],
  model: BaseChatModel,
) {
  console.log("calling write tool", accumulatedProfile, messages);
  const structuredLlm = model.withStructuredOutput(ColorProfileSchema);

  return tool(
    async () => {
      const prompt = `You are extracting a career personality profile from a coaching conversation.
Analyze the ENTIRE conversation below and extract ALL profile fields you can identify.

If you cannot determine a field with confidence, use the sentinel value "unknown" for colors/risk
or an empty array for lists, or empty string for text fields.

Current accumulated profile (merge your findings into this):
${JSON.stringify(accumulatedProfile, null, 2)}

Return the FULL merged profile — keep existing values unless the conversation
provides stronger evidence for something different.`;

      const history: BaseMessage[] = messages.filter((m) => m.type !== "system");
      const extracted = await structuredLlm.invoke([new SystemMessage(prompt), ...history]);

      // Merge: new extraction wins over accumulated, but non-empty arrays
      // and non-"unknown" values from accumulated are preserved if extraction
      // doesn't provide anything better
      const merged: ColorProfile = {
        dominantColor:
          extracted.dominantColor !== "unknown"
            ? extracted.dominantColor
            : ((accumulatedProfile.dominantColor as ColorProfile["dominantColor"]) ?? "unknown"),
        secondaryColor: extracted.secondaryColor ?? accumulatedProfile.secondaryColor,
        discProfile: extracted.discProfile ?? accumulatedProfile.discProfile,
        careerDrivers:
          extracted.careerDrivers.length > 0
            ? extracted.careerDrivers
            : (accumulatedProfile.careerDrivers ?? []),
        workStylePreferences:
          extracted.workStylePreferences.length > 0
            ? extracted.workStylePreferences
            : (accumulatedProfile.workStylePreferences ?? []),
        values: extracted.values.length > 0 ? extracted.values : (accumulatedProfile.values ?? []),
        riskAppetite:
          extracted.riskAppetite !== "unknown"
            ? extracted.riskAppetite
            : ((accumulatedProfile.riskAppetite as ColorProfile["riskAppetite"]) ?? "unknown"),
        riskProfileDetails:
          extracted.riskProfileDetails || accumulatedProfile.riskProfileDetails || "",
        changeToleranceNotes:
          extracted.changeToleranceNotes || accumulatedProfile.changeToleranceNotes || "",
        rawInsights: extracted.rawInsights || accumulatedProfile.rawInsights || "",
      };

      return JSON.stringify(merged, null, 2);
    },
    {
      name: "write_state",
      description:
        "Extract profile data from the conversation and save it to accumulated state. " +
        "Call this after EVERY meaningful discovery about the seeker's colors, drivers, " +
        "work style, values, or risk tolerance. " +
        "Returns the full merged profile as JSON so you can see what's been captured. " +
        "The profile includes: dominantColor, secondaryColor, discProfile, careerDrivers, " +
        "workStylePreferences, values, riskAppetite, riskProfileDetails, changeToleranceNotes, rawInsights.",
      schema: z.object({}),
    },
  );
}

// ---------------------------------------------------------------------------
// Node function — tool-calling loop
// ---------------------------------------------------------------------------
//
// The agent runs a loop:
//   1. Create read_state and write_state tools (closed over accumulated profile)
//   2. Bind tools to the LLM
//   3. Invoke LLM with system prompt + conversation history
//   4. If LLM returns text (no tool_calls): exit loop, return Command
//   5. If LLM returns tool_calls: execute each, add ToolMessages to history, loop
//
// State is accumulated across tool calls within a turn. The final Command
// always includes the profile (even incomplete) so the store sees updates.
// ---------------------------------------------------------------------------

export async function profileAgent(
  state: CareerState,
): Promise<Command<"router_agent" | "__end__">> {
  const systemMsg = new SystemMessage(SYSTEM_PROMPT);
  const history: BaseMessage[] = state.messages.filter((m) => m.type !== "system");

  console.log("[profileAgent] === TURN START ===");
  console.log("[profileAgent] incoming state.profile:", JSON.stringify(state.profile));
  console.log("[profileAgent] conversation turns:", history.length);

  const llm = await getLlm();

  const accumulatedProfile: Partial<ColorProfile> = { ...state.profile };
  const conversationMessages: BaseMessage[] = [systemMsg, ...history];

  const readState = makeReadStateTool(accumulatedProfile);
  const writeState = makeWriteStateTool(accumulatedProfile, conversationMessages, llm);

  let llmWithTools = (llm as any).bindTools([readState, writeState]);

  console.log("[profileAgent] tools bound: read_state, write_state");

  // Tool-calling loop — allow up to 8 iterations to prevent infinite loops
  const MAX_TOOL_ITERATIONS = 8;
  let lastTextContent = "";
  let isComplete = false;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    console.log(`[profileAgent] --- loop iteration ${i} ---`);
    const response = await llmWithTools.invoke(conversationMessages);
    const aiMsg = response as AIMessage;

    // Check for tool calls
    const toolCalls = (aiMsg as AIMessage).tool_calls;
    console.log(
      "[profileAgent] LLM response — has tool_calls:",
      toolCalls ? toolCalls.length : 0,
      toolCalls ? toolCalls.map((tc) => tc.name) : "none",
    );
    console.log(
      "[profileAgent] LLM text content:",
      (typeof aiMsg.content === "string" ? aiMsg.content : "").slice(0, 200),
    );

    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — this is the final text response
      lastTextContent =
        typeof aiMsg.content === "string"
          ? aiMsg.content
          : Array.isArray(aiMsg.content)
            ? aiMsg.content
                .map((c) => (typeof c === "string" ? c : ((c as { text?: string }).text ?? "")))
                .join("")
            : "";

      // Check if accumulated profile is now complete
      isComplete =
        accumulatedProfile.dominantColor !== undefined &&
        accumulatedProfile.dominantColor !== "unknown";
      break;
    }

    // Add the AI message (with tool calls) to conversation history
    conversationMessages.push(aiMsg);

    // Execute each tool call and collect ToolMessages
    for (const tc of toolCalls) {
      console.log(`[profileAgent] executing tool: ${tc.name} (id: ${tc.id})`);
      let toolResult: string;
      if (tc.name === "read_state") {
        toolResult = (await readState.invoke((tc.args ?? {}) as any)) as unknown as string;
        console.log("[profileAgent] read_state result:", toolResult.slice(0, 300));
      } else if (tc.name === "write_state") {
        // write_state extracts from conversation and merges into accumulated
        console.log("[profileAgent] write_state: extracting profile from conversation...");
        toolResult = (await writeState.invoke((tc.args ?? {}) as any)) as unknown as string;
        console.log("[profileAgent] write_state result:", toolResult.slice(0, 300));
        // Parse the result and merge back into the mutable container.
        // Object.assign mutates the same object the tools close over.
        try {
          const parsed = JSON.parse(toolResult) as Partial<ColorProfile>;
          Object.assign(accumulatedProfile, parsed);
          console.log(
            "[profileAgent] accumulated profile now:",
            JSON.stringify(accumulatedProfile),
          );
        } catch (err) {
          console.error("[profileAgent] failed to parse write_state result:", err);
        }
      } else {
        toolResult = JSON.stringify({ error: `Unknown tool: ${tc.name}` });
      }

      conversationMessages.push(new ToolMessage(toolResult, tc.id ?? "unknown"));
    }

    // Re-bind tools with updated profile so write_state's prompt reflects
    // the latest accumulated state in its JSON.stringify
    const freshReadState = makeReadStateTool(accumulatedProfile);
    const freshWriteState = makeWriteStateTool(accumulatedProfile, conversationMessages, llm);
    llmWithTools = (llm as any).bindTools([freshReadState, freshWriteState]);
  }

  // ── Safety-net: always extract profile from the full conversation ──────
  // The LLM may have discussed findings without calling write_state.
  // This ensures every turn's discoveries are persisted regardless of
  // whether the LLM remembered to use the tool.
  //
  // Wrapped in try/catch so a structured-output failure (network, schema,
  // context length) cannot break the agent or prevent trace export.
  /*try {
    console.log("[profileAgent] safety-net: extracting profile from full conversation...");
    const safetyWriteState = makeWriteStateTool(accumulatedProfile, conversationMessages, llm);
    const safetyResult = await safetyWriteState.invoke({});
    const parsed = JSON.parse(safetyResult) as Partial<ColorProfile>;
    Object.assign(accumulatedProfile, parsed);
    console.log(
      "[profileAgent] safety-net accumulated profile:",
      JSON.stringify(accumulatedProfile),
    );

    // Re-evaluate completeness after safety-net extraction
    isComplete =
      accumulatedProfile.dominantColor !== undefined &&
      accumulatedProfile.dominantColor !== "unknown";
  } catch (err) {
    console.error(
      "[profileAgent] safety-net write_state failed (profile NOT updated this turn):",
      (err as Error).message,
    );
    // Keep whatever isComplete was set to from the tool-calling loop
    }*/

  // ── Build the display message ───────────────────────────────────────────
  const displayMessage = new AIMessage(lastTextContent);

  // ── Return Command with accumulated profile always included ───────────────
  if (isComplete) {
    console.log("[profileAgent] Profile complete:", JSON.stringify(accumulatedProfile));
    return new Command({
      update: {
        messages: [displayMessage],
        profile: accumulatedProfile,
        agentTurnCount: state.agentTurnCount + 1,
        activeAgent: "router",
      },
      goto: "__end__",
    });
  }

  return new Command({
    update: {
      messages: [displayMessage],
      profile: accumulatedProfile,
      agentTurnCount: state.agentTurnCount + 1,
      activeAgent: "profile",
    },
    goto: "__end__",
  });
}
