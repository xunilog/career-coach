// src/renderer/components/chat/ConversationDropdown.tsx
// ---------------------------------------------------------------------------
// Dropdown for selecting, creating, and deleting Career Coach conversations.
// Shows current conversation title + date, with a menu of all conversations
// ordered by updated_at descending.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { Menu, Button, Text, Group, ActionIcon, Divider, Stack } from "@mantine/core";
import { MdArrowDropDown, MdAdd, MdDelete } from "react-icons/md";
import type { Conversation } from "../../../services/conversation-service";

function relativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export interface ConversationDropdownProps {
  /** Currently selected conversation (threadId). */
  currentThreadId: string;
  /** All available conversations, ordered by updated_at descending. */
  conversations: Conversation[];
  /** Called when the user selects a conversation from the list. */
  onSelect: (conversation: Conversation) => void;
  /** Called when the user clicks "New Chat". */
  onNewChat: () => void;
  /** Called when the user clicks delete on a conversation. */
  onDelete: (threadId: string) => void;
}

export function ConversationDropdown({
  currentThreadId,
  conversations,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationDropdownProps) {
  const currentConversation = useMemo(
    () => conversations.find((c) => c.threadId === currentThreadId),
    [conversations, currentThreadId],
  );

  // The most recent conversation in the list (first item)
  const latestConversation = conversations[0];

  // Show "newer" indicator if the current isn't the latest
  const hasNewer = latestConversation && currentThreadId !== latestConversation.threadId;

  const displayTitle = currentConversation?.title ?? "New Chat";
  const truncatedTitle =
    displayTitle.length > 50 ? displayTitle.slice(0, 50) + "\u2026" : displayTitle;

  return (
    <Group gap={4}>
      <Menu shadow="md" width={320} position="bottom-start">
        <Menu.Target>
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            rightSection={<MdArrowDropDown size={16} />}
          >
            <Stack gap={0} align="flex-start">
              <Text fw={600} size="sm" truncate maw={200}>
                {truncatedTitle}
              </Text>
              {currentConversation && (
                <Text size="xs" c="dimmed">
                  {relativeTime(currentConversation.updatedAt)}
                </Text>
              )}
            </Stack>
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Conversations</Menu.Label>

          {/* New Chat button */}
          <Menu.Item leftSection={<MdAdd size={14} />} onClick={onNewChat}>
            <Text fw={500}>New Chat</Text>
          </Menu.Item>

          <Menu.Divider />

          {/* Conversation list */}
          {conversations.length === 0 ? (
            <Menu.Item disabled>
              <Text c="dimmed" size="sm">
                No conversations yet
              </Text>
            </Menu.Item>
          ) : (
            conversations.map((conv) => (
              <Menu.Item
                key={conv.threadId}
                onClick={() => onSelect(conv)}
                bg={
                  conv.threadId === currentThreadId ? "var(--mantine-color-blue-light)" : undefined
                }
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.threadId);
                    }}
                  >
                    <MdDelete size={12} />
                  </ActionIcon>
                }
              >
                <Stack gap={0}>
                  <Text size="sm" fw={conv.threadId === currentThreadId ? 600 : 400} truncate>
                    {conv.title.length > 50 ? conv.title.slice(0, 50) + "\u2026" : conv.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {relativeTime(conv.updatedAt)}
                  </Text>
                </Stack>
              </Menu.Item>
            ))
          )}
        </Menu.Dropdown>
      </Menu>

      {/* Up arrow indicator for newer conversation */}
      {hasNewer && (
        <ActionIcon
          variant="light"
          color="blue"
          size="sm"
          onClick={() => onSelect(latestConversation!)}
          title="Jump to newest conversation"
        >
          <Text fz={14}>↑</Text>
        </ActionIcon>
      )}
    </Group>
  );
}
