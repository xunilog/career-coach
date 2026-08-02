// src/renderer/components/chat/ConversationHistoryModal.tsx
// ---------------------------------------------------------------------------
// Modal listing all conversations for a given coach type. Each row shows
// the conversation title + relative timestamp, with select and delete actions.
// ---------------------------------------------------------------------------

import { Stack, Text, Group, ActionIcon, Tooltip } from "@mantine/core";
import { AppModal } from "../shared/AppModal";
import { MdDelete, MdCheck } from "react-icons/md";
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

export interface ConversationHistoryModalProps {
  opened: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentThreadId: string;
  onSelect: (conversation: Conversation) => void;
  onDelete: (threadId: string) => void;
}

export function ConversationHistoryModal({
  opened,
  onClose,
  conversations,
  currentThreadId,
  onSelect,
  onDelete,
}: ConversationHistoryModalProps) {
  return (
    <AppModal opened={opened} onClose={onClose} title="Conversation History">
      {conversations.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          No conversations yet
        </Text>
      ) : (
        <Stack gap="xs">
          {conversations.map((conv) => {
            const isActive = conv.threadId === currentThreadId;
            const truncatedTitle =
              conv.title.length > 60 ? conv.title.slice(0, 60) + "\u2026" : conv.title;

            return (
              <Group
                key={conv.threadId}
                justify="space-between"
                wrap="nowrap"
                p="sm"
                style={{
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive
                    ? "var(--mantine-color-blue-light)"
                    : "var(--mantine-color-dark-6)",
                }}
                onClick={() => {
                  onSelect(conv);
                  onClose();
                }}
              >
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" wrap="nowrap">
                    {isActive && <MdCheck size={14} />}
                    <Text size="sm" fw={isActive ? 600 : 400} truncate>
                      {truncatedTitle}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {relativeTime(conv.updatedAt)}
                  </Text>
                </Stack>
                <Tooltip label="Delete conversation">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.threadId);
                    }}
                  >
                    <MdDelete size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            );
          })}
        </Stack>
      )}
    </AppModal>
  );
}
