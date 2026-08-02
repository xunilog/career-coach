// src/renderer/components/job-detail/StatusHistoryPanel.tsx
// ---------------------------------------------------------------------------
// Timeline of status changes with timestamps and optional notes.
// Displayed in the job detail view.
// ---------------------------------------------------------------------------

import { Timeline, Text, Loader, Center, Box, Paper } from "@mantine/core";
import type { StatusHistoryEntry } from "../../../shared/types";

const STATUS_EMOJI: Record<string, string> = {
  "--": "—",
  Saved: "💾",
  "Applied 📤": "📤",
  "Interview 🤝": "🤝",
  "Offer 🎉": "🎉",
  "Rejected ❌": "❌",
  Archived: "📦",
};

interface StatusHistoryPanelProps {
  history: StatusHistoryEntry[];
  isLoading: boolean;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatusHistoryPanel({ history, isLoading }: StatusHistoryPanelProps) {
  if (isLoading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  if (history.length === 0) {
    return (
      <Center py="md">
        <Box ta="center">
          <Text size="sm" c="dimmed">
            No status history yet.
          </Text>
        </Box>
      </Center>
    );
  }

  return (
    <Paper p="sm" withBorder>
      <Text fw={700} size="sm" mb="xs" tt="uppercase" c="dimmed">
        Status History
      </Text>
      <Timeline active={history.length - 1} bulletSize={24} lineWidth={2}>
        {history.map((entry) => {
          const fromLabel = entry.fromStatus
            ? `${STATUS_EMOJI[entry.fromStatus] ?? ""} ${entry.fromStatus}`
            : "No status";
          const toLabel = `${STATUS_EMOJI[entry.toStatus] ?? ""} ${entry.toStatus}`;

          return (
            <Timeline.Item
              key={entry.id}
              title={
                <Text size="sm" span>
                  {fromLabel} → {toLabel}
                </Text>
              }
            >
              <Text size="xs" c="dimmed">
                {formatTimestamp(entry.changedAt)}
              </Text>
              {entry.notes && (
                <Text size="sm" mt={4}>
                  {entry.notes}
                </Text>
              )}
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Paper>
  );
}
