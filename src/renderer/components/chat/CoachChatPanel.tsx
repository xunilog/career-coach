// src/renderer/components/chat/CoachChatPanel.tsx
// ---------------------------------------------------------------------------
// Reusable coach chat panel — encapsulates conversation management and chat UI.
// Used by both ProfileEditor (profile coach) and ExperienceEditor (experience coach).
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useEffect } from "react";
import { Paper, Stack, Group, Text, ActionIcon, Loader, Box, Tooltip } from "@mantine/core";
import { MdAdd, MdHistory, MdSend, MdPsychology } from "react-icons/md";
import { useCareerStore } from "../../stores/careerStore";
import type { AgentName } from "../../../shared/state";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { ConversationHistoryModal } from "./ConversationHistoryModal";
import {
  useConversationsQuery,
  useLatestConversation,
  useCreateConversation,
  useDeleteConversation,
} from "../../hooks/useConversationQueries";
import { useScrollToBottom } from "../../hooks/useScrollToBottom";
import type { Conversation } from "../../../services/conversation-service";

export interface CoachChatPanelProps {
  /** Coach type used for conversation queries and sendMessage fallback. */
  coachType: string;
  /** Icon to show in the empty state. */
  icon?: React.ReactNode;
  /** Text shown when there are no messages. */
  emptyStateText: string;
  /** Chat input placeholder text. */
  placeholder: string;
  /** Force a specific agent, overriding coachType for sendMessage. */
  forceAgent?: "profile" | "experience" | "resume" | "job";
  /** Height of the parent column (CSS value). */
  colH: string;
}

export function CoachChatPanel({
  coachType,
  icon,
  emptyStateText,
  placeholder,
  forceAgent,
  colH,
}: CoachChatPanelProps) {
  const threadId = useCareerStore((s) => s.threadId);
  const setConversations = useCareerStore((s) => s.setConversations);
  const loadConversation = useCareerStore((s) => s.loadConversation);
  const initializeFromStorage = useCareerStore((s) => s.initializeFromStorage);
  const startNewConversation = useCareerStore((s) => s.startNewConversation);

  // ── Conversation queries (scoped to coachType) ─────────────────────
  const { data: conversations = [] } = useConversationsQuery(coachType);
  const createConversation = useCreateConversation(coachType);
  const deleteConversation = useDeleteConversation();

  // ── Auto-select latest conversation of this type on mount ──────────
  const hasAutoInitialized = useRef(false);
  const { data: latestConversation } = useLatestConversation(coachType);

  useEffect(() => {
    if (hasAutoInitialized.current) return;
    if (latestConversation === undefined) return; // still loading

    hasAutoInitialized.current = true;

    if (latestConversation === null) {
      // No conversations of this type yet — create one in the DB so that
      // messages are persisted under a real thread_id, not a transient
      // session ID that would be lost on navigation.
      void createConversation.mutateAsync().then((newConv) => {
        startNewConversation(newConv);
        void initializeFromStorage();
      });
      return;
    }

    // Only load if we're not already on this conversation
    if (latestConversation.threadId !== threadId) {
      void loadConversation(latestConversation);
    }
  }, [
    latestConversation,
    threadId,
    loadConversation,
    initializeFromStorage,
    startNewConversation,
    createConversation,
  ]);

  // Sync conversations to the store whenever the query updates
  useEffect(() => {
    if (conversations.length > 0) {
      setConversations(conversations);
    }
  }, [conversations, setConversations]);

  // ── Conversation handlers ──────────────────────────────────────────

  const handleSelectConversation = async (conversation: Conversation) => {
    await loadConversation(conversation);
  };

  const handleNewChat = async () => {
    const newConv = await createConversation.mutateAsync();
    startNewConversation(newConv);
  };

  const handleDeleteConversation = async (conversationThreadId: string) => {
    await deleteConversation.mutateAsync(conversationThreadId);
    if (conversationThreadId === threadId) {
      const remaining = conversations.filter((c) => c.threadId !== conversationThreadId);
      if (remaining.length > 0) {
        await loadConversation(remaining[0]);
      } else {
        const newConv = await createConversation.mutateAsync();
        startNewConversation(newConv);
      }
    }
  };

  // ── History modal state ────────────────────────────────────────────
  const [historyOpened, setHistoryOpened] = useState(false);

  return (
    <Paper p={0} radius={0} h={colH}>
      <Stack h={colH} gap={0}>
        {/* ── Top: history + new chat buttons ──────────────────────── */}
        <Group gap={4} wrap="nowrap" justify="flex-end">
          <Tooltip label="Conversation History">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              aria-label="Conversation History"
              onClick={() => setHistoryOpened(true)}
            >
              <MdHistory size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="New Conversation">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              aria-label="New Conversation"
              onClick={handleNewChat}
            >
              <MdAdd size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* ── Messages ─────────────────────────────────────────────── */}
        <CoachChatMessages icon={icon} emptyStateText={emptyStateText} />

        {/* ── Input row ────────────────────────────────────────────── */}
        <CoachChatInputRow
          placeholder={placeholder}
          forceAgent={forceAgent}
          coachType={coachType}
        />
      </Stack>

      {/* ── Conversation History Modal ─────────────────────────────── */}
      <ConversationHistoryModal
        opened={historyOpened}
        onClose={() => setHistoryOpened(false)}
        conversations={conversations}
        currentThreadId={threadId}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
      />
    </Paper>
  );
}

// ── Message list — isolated so keystrokes in the input don't re-render it ─

function CoachChatMessages({
  icon,
  emptyStateText,
}: {
  icon?: React.ReactNode;
  emptyStateText: string;
}) {
  const messages = useCareerStore((s) => s.messages);
  const isStreaming = useCareerStore((s) => s.isStreaming);
  const streamingReasoning = useCareerStore((s) => s.streamingReasoning);
  const isReasoningPhase = useCareerStore((s) => s.isReasoningPhase);

  const { bottomRef, scrollableRef } = useScrollToBottom({
    autoScrollDeps: [messages, streamingReasoning, isStreaming, isReasoningPhase],
  });

  return (
    <Box ref={scrollableRef} style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      {messages.length === 0 ? (
        <Stack align="center" justify="center" style={{ minHeight: 200 }} py="xl" px="md">
          {icon}
          <Text c="dimmed" ta="center">
            {emptyStateText}
          </Text>
        </Stack>
      ) : (
        <Stack gap="md" p="sm">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {/* Streaming reasoning: live display while reasoning content is available */}
          {isStreaming && streamingReasoning && (
            <Group gap="xs" pl="sm" align="flex-start" wrap="nowrap">
              <MdPsychology size={14} style={{ marginTop: 2, opacity: 0.6 }} />
              <Text
                size="xs"
                c="dimmed"
                fs="italic"
                style={{
                  paddingLeft: 6,
                  borderLeft: "2px solid var(--mantine-color-dark-4)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {streamingReasoning}
              </Text>
            </Group>
          )}
          {/* Fallback: generic loader when streaming but no reasoning content yet */}
          {isStreaming && !streamingReasoning && (
            <Group gap="xs" pl="sm">
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Thinking...
              </Text>
            </Group>
          )}
        </Stack>
      )}
      {/* Sentinel element for scroll-to-bottom detection — kept outside
          the conditional so Mantine's useScrollIntoView ResizeObserver
          never loses its target element when messages are cleared. */}
      <div ref={bottomRef} />
    </Box>
  );
}

// ── Input row — owns chatInput state; keystrokes only re-render this row ─

function CoachChatInputRow({
  placeholder,
  forceAgent,
  coachType,
}: {
  placeholder: string;
  forceAgent?: "profile" | "experience" | "resume" | "job";
  coachType: string;
}) {
  const isStreaming = useCareerStore((s) => s.isStreaming);
  const sendMessage = useCareerStore((s) => s.sendMessage);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef(chatInput);
  useEffect(() => {
    chatInputRef.current = chatInput;
  }, [chatInput]);

  // Stable reference — reads chatInput from ref, not closure
  const handleChatSend = useCallback(
    async (text?: string) => {
      const message = (text ?? chatInputRef.current).trim();
      if (!message || isStreaming) return;
      setChatInput("");
      try {
        await sendMessage(message, forceAgent || (coachType as AgentName));
      } catch {
        setChatInput(message);
      }
    },
    [isStreaming, sendMessage, forceAgent, coachType],
  );

  return (
    <Group gap={0} mt="sm" wrap="nowrap" align="flex-end">
      <ChatInput
        value={chatInput}
        placeholder={isStreaming ? "Waiting for response..." : placeholder}
        disabled={isStreaming}
        onChange={setChatInput}
        onSend={handleChatSend}
      />
      <ActionIcon
        color={
          coachType === "profile"
            ? "profile.4"
            : coachType === "experience"
              ? "experience.4"
              : "resume.4"
        }
        disabled={!chatInput.trim() || isStreaming}
        onClick={() => handleChatSend()}
        h="100%"
        radius={0}
      >
        <MdSend size={16} />
      </ActionIcon>
    </Group>
  );
}
