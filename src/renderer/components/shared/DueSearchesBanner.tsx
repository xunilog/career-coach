// src/renderer/components/shared/DueSearchesBanner.tsx
// ---------------------------------------------------------------------------
// Banner shown on app start when due searches exist.
// "Run now" triggers search-all via IPC. "Dismiss" hides the banner.
// ---------------------------------------------------------------------------

import { Paper, Text, Button, Group } from "@mantine/core";

interface DueSearch {
  id: string;
  title: string;
}

interface DueSearchesBannerProps {
  count: number;
  searches: DueSearch[];
  onRunNow: () => void;
  onDismiss: () => void;
  isRunning: boolean;
}

export function DueSearchesBanner({
  count,
  searches,
  onRunNow,
  onDismiss,
  isRunning,
}: DueSearchesBannerProps) {
  const label = count === 1 ? "1 search is due" : `${count} searches are due`;

  return (
    <Paper p="sm" withBorder mb="md" bg="var(--mantine-color-blue-light)">
      <Group justify="space-between" wrap="wrap">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            ⏰ {label}
          </Text>
          <Text size="xs" c="dimmed">
            {searches.map((s) => s.title).join(", ")}
          </Text>
        </Group>
        <Group gap="xs">
          <Button size="xs" variant="filled" onClick={onRunNow} loading={isRunning}>
            {isRunning ? "Running…" : "Run now"}
          </Button>
          <Button size="xs" variant="subtle" color="gray" onClick={onDismiss} disabled={isRunning}>
            Dismiss
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
