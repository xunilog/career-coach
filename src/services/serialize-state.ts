// src/services/serialize-state.ts
// ---------------------------------------------------------------------------
// Pure functions for serializing CareerState and LangChain messages into
// plain objects suitable for transfer. Extracted from graph-ipc.ts.
// Moved from src/main/serialize-state.ts (no changes needed — pure logic).
// ---------------------------------------------------------------------------

interface SerializedMessage {
  lc?: number;
  type: string;
  id?: string | string[];
  kwargs?: {
    content: unknown;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    id?: string;
    tool_calls?: unknown[];
    invalid_tool_calls?: unknown[];
  };
  content?: unknown;
  tool_calls?: unknown[];
  additional_kwargs?: Record<string, unknown>;
}

function hasToolCalls(m: SerializedMessage): boolean {
  if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) return true;
  if (m.kwargs && Array.isArray(m.kwargs.tool_calls) && m.kwargs.tool_calls.length > 0) return true;
  return false;
}

interface NormalizedMessage {
  type: string;
  content: unknown;
  reasoningContent?: string;
}

function normalizeMessage(m: SerializedMessage): NormalizedMessage | null {
  if (hasToolCalls(m)) return null;

  let result: NormalizedMessage | null = null;

  if (m.content !== undefined) {
    if (m.type === "tool") return null;
    result = { type: m.type, content: m.content };
  }

  if (m.lc === 1 && m.type === "constructor" && m.kwargs) {
    const msgType = Array.isArray(m.id) ? (m.id[m.id.length - 1] as string) : (m.id ?? "unknown");

    if (msgType === "ToolMessage") return null;

    const typeMap: Record<string, string> = {
      HumanMessage: "human",
      AIMessage: "ai",
      SystemMessage: "system",
    };
    const simpleType = typeMap[msgType] ?? msgType;

    result = { type: simpleType, content: m.kwargs.content };
  }

  if (!result) return null;

  const ak = m.additional_kwargs ?? m.kwargs?.additional_kwargs;
  if (ak && "reasoning_content" in ak) {
    const rc = ak.reasoning_content;
    if (typeof rc === "string") {
      result.reasoningContent = rc;
    }
  }

  return result;
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        "text" in block &&
        typeof (block as Record<string, unknown>).text === "string"
      ) {
        parts.push((block as Record<string, string>).text);
      }
    }
    if (parts.length > 0) return parts.join("");
  }
  return JSON.stringify(content);
}

function extractReasoningContent(
  content: unknown,
  additionalKwargsReasoning?: string,
): string | undefined {
  if (additionalKwargsReasoning) return additionalKwargsReasoning;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        "thinking" in block &&
        typeof (block as Record<string, unknown>).thinking === "string"
      ) {
        parts.push((block as Record<string, string>).thinking);
      }
    }
    if (parts.length > 0) return parts.join("");
  }
  return undefined;
}

export function serializeMessages(
  messages: Array<SerializedMessage>,
): Array<{ type: string; content: string; reasoningContent?: string }> {
  const result: Array<{ type: string; content: string; reasoningContent?: string }> = [];

  for (const m of messages) {
    const normalized = normalizeMessage(m);
    if (!normalized || normalized.content == null) continue;

    const reasoningContent = extractReasoningContent(
      normalized.content,
      normalized.reasoningContent,
    );

    const entry: { type: string; content: string; reasoningContent?: string } = {
      type: normalized.type,
      content: extractTextContent(normalized.content),
    };
    if (reasoningContent !== undefined) {
      entry.reasoningContent = reasoningContent;
    }
    result.push(entry);
  }

  return result;
}

export function serializeCareerState(state: {
  activeAgent?: string;
  profile?: Record<string, unknown>;
  experiences?: unknown[];
  targetJob?: string;
  resumeDraft?: string;
  messages?: Array<SerializedMessage>;
}) {
  return {
    activeAgent: state.activeAgent ?? "router",
    profile: state.profile ?? {},
    experiences: (state.experiences ?? []) as Record<string, unknown>[],
    targetJob: state.targetJob ?? "",
    resumeDraft: state.resumeDraft ?? "",
    messages: state.messages ? serializeMessages(state.messages) : [],
  };
}
