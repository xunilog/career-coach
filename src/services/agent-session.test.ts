import { describe, it, expect } from "vitest";
import { streamAgentMessages } from "./agent-session";
import type { StreamUpdate } from "./agent-session";

function msg(content: unknown): { content: unknown; _getType?: () => string } {
  return { content };
}

function aiMsg(content: unknown) {
  return { content, type: "ai" } as const;
}

import type { BaseMessage } from "@langchain/core/messages";

// Build a mock async iterable from an array of BaseMessage-shaped chunks
async function* mockStream(
  chunks: Array<{ content: unknown; type?: string; _getType?: () => string }>,
): AsyncIterable<BaseMessage | [BaseMessage, unknown]> {
  for (const chunk of chunks) {
    yield [chunk as unknown as BaseMessage, {} as unknown] as [BaseMessage, unknown];
  }
}

describe("streamAgentMessages", () => {
  it("emits thinking phase when chunk contains thinking blocks", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const stream = mockStream([
      msg([
        { type: "thinking", thinking: "Hmm, let me consider..." },
        { type: "text", text: "Hello" },
      ]),
    ]);

    await streamAgentMessages(stream, [], onUpdate);

    const thinkingUpdate = updates.find((u) => u.isReasoningPhase);
    expect(thinkingUpdate).toBeDefined();
    expect(thinkingUpdate!.streamingReasoning).toBe("Hmm, let me consider...");
  });

  it("accumulates text across multiple chunks", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const stream = mockStream([aiMsg("Hello "), aiMsg("world")]);

    await streamAgentMessages(stream, [], onUpdate);

    const lastUpdate = updates[updates.length - 1];
    expect(lastUpdate.messages).toHaveLength(1);
    expect(lastUpdate.messages[0].content).toBe("Hello world");
  });

  it("replaces the streaming message on each text update", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const stream = mockStream([aiMsg("One"), aiMsg("Two"), aiMsg("Three")]);

    await streamAgentMessages(stream, [], onUpdate);

    // Each text update should have exactly 1 AI message with accumulated text
    const textUpdates = updates.filter((u) => !u.isReasoningPhase);
    expect(textUpdates).toHaveLength(3);
    expect(textUpdates[0].messages[0].content).toBe("One");
    expect(textUpdates[1].messages[0].content).toBe("OneTwo");
    expect(textUpdates[2].messages[0].content).toBe("OneTwoThree");
  });

  it("preserves existing messages and appends the AI message", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const existing = [{ type: "human", content: "What is my profile?" }];

    const stream = mockStream([aiMsg("Your profile shows...")]);

    await streamAgentMessages(stream, existing, onUpdate);

    const lastUpdate = updates[updates.length - 1];
    expect(lastUpdate.messages).toHaveLength(2);
    expect(lastUpdate.messages[0]).toEqual(existing[0]);
    expect(lastUpdate.messages[1].type).toBe("ai");
  });

  it("clears reasoning phase when text arrives", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const stream = mockStream([
      msg([{ type: "thinking", thinking: "Let me think..." }]),
      aiMsg("Here is the answer."),
    ]);

    await streamAgentMessages(stream, [], onUpdate);

    const lastUpdate = updates[updates.length - 1];
    expect(lastUpdate.isReasoningPhase).toBe(false);
    expect(lastUpdate.streamingReasoning).toBe("");
  });

  it("handles string content (not array)", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const stream = mockStream([aiMsg("Plain string response")]);

    await streamAgentMessages(stream, [], onUpdate);

    const lastUpdate = updates[updates.length - 1];
    expect(lastUpdate.messages[0].content).toBe("Plain string response");
  });

  it("returns no messages for non-AI, non-thinking chunks", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const stream = mockStream([
      { content: "tool result", type: "tool" } as unknown as { content: unknown; type?: string },
    ]);

    await streamAgentMessages(stream, [], onUpdate);

    // Tool messages should NOT produce text updates
    const textUpdates = updates.filter((u) => !u.isReasoningPhase);
    expect(textUpdates).toHaveLength(0);
  });

  it("detects AI message by _getType method", async () => {
    const updates: StreamUpdate[] = [];
    const onUpdate = (u: StreamUpdate) => updates.push(u);

    const msgWithGetType = {
      content: "Response via getType",
      _getType: () => "ai",
    };

    const stream = mockStream([msgWithGetType as unknown as { content: unknown; type?: string }]);

    await streamAgentMessages(stream, [], onUpdate);

    const lastUpdate = updates[updates.length - 1];
    expect(lastUpdate.messages[0].content).toBe("Response via getType");
  });
});
