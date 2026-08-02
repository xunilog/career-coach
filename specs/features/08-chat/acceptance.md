# Acceptance Notes — Conversation History

## Edge Cases

- **No conversations on first launch**: Auto-creates one with title "New Chat" and a generated thread_id.
- **Very long first message**: Title truncated to 50 characters + "…".
- **First message is a code block or emoji**: Title is the raw text. No special handling.
- **Rapid conversation switching**: Messages load from checkpoints asynchronously. UI shows loading state.
- **Delete during active stream**: Deletion is blocked while a stream is active for that conversation.
- **Zero conversations after delete**: Auto-creates a new empty conversation.

## Non-Functional

- **Title generation**: Simple truncation of first user message — no LLM call. Fast, predictable, zero API cost.
- **Checkpoint cleanup**: Deleting a conversation cascades to `langgraph_checkpoints` and `langgraph_writes` tables. Managed by the conversation:delete IPC handler.
- **Scope**: Career Coach chat only (type = "general"). Document generation context-aware chats are per-job and not persisted as conversations.

## Dependencies

- `SqlCheckpointer` from LangGraph for checkpoint persistence.
- `conversations` table joined with `langgraph_checkpoints` via `thread_id`.
- No foreign key between `conversations` and `langgraph_checkpoints` because checkpoints may not exist yet when a conversation is first created.
