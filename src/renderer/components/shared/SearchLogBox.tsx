// src/renderer/components/shared/SearchLogBox.tsx
// ---------------------------------------------------------------------------
// Temporary log box showing accumulated search progress messages.
// Auto-scrolls to bottom, shows a "complete" footer when done.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { Paper, Text } from "@mantine/core";

interface SearchLogBoxProps {
  logs: string[];
  isSearching: boolean;
}

export function SearchLogBox({ logs, isSearching }: SearchLogBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <Paper withBorder p="sm" mb="md">
      <div
        ref={scrollRef}
        style={{
          maxHeight: 200,
          overflow: "auto",
          fontFamily: "'Noto Sans Mono', monospace",
        }}
      >
        {logs.map((line, i) => (
          <Text key={i} size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
            {line}
          </Text>
        ))}
        {!isSearching && (
          <Text size="xs" c="green" mt="xs">
            Search complete.
          </Text>
        )}
      </div>
    </Paper>
  );
}
