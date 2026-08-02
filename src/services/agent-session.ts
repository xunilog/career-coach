// src/services/agent-session.ts
// ---------------------------------------------------------------------------
// Streaming session runner — consumes an agent stream and calls onUpdate
// with incremental message state. Extracted from careerStore.sendMessage
// where the same ~40-line loop was duplicated five times.
// ---------------------------------------------------------------------------

import type { BaseMessage } from "@langchain/core/messages";

export interface StreamUpdate {
  messages: Array<{ type: string; content: string }>;
  streamingReasoning: string;
  isReasoningPhase: boolean;
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: string; text?: string } =>
          block != null && typeof block === "object" && "type" in block && block.type === "text",
      )
      .map((block) => block.text ?? "")
      .join("\n");
  }
  return String(content);
}

function extractThinkingFromContent(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content) {
    if (
      block != null &&
      typeof block === "object" &&
      "type" in block &&
      block.type === "thinking" &&
      "thinking" in block &&
      typeof (block as { thinking: unknown }).thinking === "string"
    ) {
      parts.push((block as { thinking: string }).thinking);
    }
  }
  return parts.length > 0 ? parts.join("") : null;
}

function isAIMessage(msg: unknown): boolean {
  const m = msg as { type?: string; _getType?: () => string };
  if (m.type === "ai") return true;
  if (typeof m._getType === "function") return m._getType() === "ai";
  return false;
}

export async function streamAgentMessages(
  stream: AsyncIterable<BaseMessage | [BaseMessage, unknown]>,
  existingMessages: Array<{ type: string; content: string }>,
  onUpdate: (update: StreamUpdate) => void,
): Promise<void> {
  let accumulatedText = "";
  let streamingMsgIndex = -1;
  let reasoning = "";
  let messages = [...existingMessages];

  for await (const chunk of stream) {
    const msg: BaseMessage = Array.isArray(chunk) ? chunk[0] : chunk;

    const thinking = extractThinkingFromContent(msg.content);
    if (thinking) {
      reasoning += thinking;
      onUpdate({ messages, streamingReasoning: reasoning, isReasoningPhase: true });
    }

    const text = isAIMessage(msg) ? extractTextContent(msg.content) : "";
    if (text) {
      reasoning = "";
      accumulatedText += text;

      if (streamingMsgIndex >= 0) {
        messages = [...messages];
        messages[streamingMsgIndex] = { type: "ai", content: accumulatedText };
      } else {
        streamingMsgIndex = messages.length;
        messages = [...messages, { type: "ai", content: accumulatedText }];
      }
      onUpdate({ messages, streamingReasoning: "", isReasoningPhase: false });
    }
  }
}
