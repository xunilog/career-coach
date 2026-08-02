// src/renderer/components/job-detail/JobDescriptionTab.tsx
// ---------------------------------------------------------------------------
// Read-only markdown render of the job description plus an editable notes
// field that auto-saves on blur (Ctrl+S).
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Textarea, Text, Loader, Center, Paper } from "@mantine/core";
import { MdDescription } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * LinkedIn descriptions often use ** and _ as paragraph markers rather than
 * standard markdown bold/italic. These unclosed markers render as literal
 * junk characters. Strip them so the text reads cleanly.
 */
export function isLoneMarker(line: string, marker: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith(marker) && !trimmed.slice(marker.length).includes(marker);
}

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <Text component="p" size="sm" style={{ margin: "0.4em 0" }}>
      {children}
    </Text>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <pre
          style={{
            background: "var(--mantine-color-dark-8)",
            padding: "0.6em 0.8em",
            borderRadius: 6,
            overflowX: "auto",
            fontSize: "0.85em",
          }}
        >
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code
        style={{
          background: "var(--mantine-color-dark-8)",
          padding: "0.1em 0.3em",
          borderRadius: 4,
          fontSize: "0.9em",
        }}
      >
        {children}
      </code>
    );
  },
  ul: ({ children }) => <ul style={{ paddingLeft: "1.5em", margin: "0.4em 0" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: "1.5em", margin: "0.4em 0" }}>{children}</ol>,
  li: ({ children }) => (
    <Text component="li" size="sm" style={{ margin: "0.2em 0" }}>
      {children}
    </Text>
  ),
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
};

export function cleanLinkedInMarkup(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (isLoneMarker(trimmed, "**")) {
      // Collect consecutive ** marker lines
      const runStart = i;
      while (i + 1 < lines.length && isLoneMarker(lines[i + 1], "**")) {
        i++;
      }

      if (i > runStart) {
        // Two or more consecutive ** lines → convert to ## headers
        for (let j = runStart; j <= i; j++) {
          result.push("## " + lines[j].trim().slice(2).trim());
        }
      } else {
        // Single ** line → strip the marker
        result.push(trimmed.slice(2).trim());
      }
    } else if (isLoneMarker(trimmed, "_")) {
      // LinkedIn uses _ as an italic paragraph marker
      result.push(trimmed.slice(1).trim());
    } else {
      result.push(trimmed);
    }

    i++;
  }

  return result.join("\n");
}

interface JobDescriptionTabProps {
  description: string | null;
  notes: string | null;
  onSaveNotes?: (notes: string) => void;
  isLoading?: boolean;
  source?: string;
}

export function JobDescriptionTab({
  description,
  notes,
  onSaveNotes,
  isLoading,
  source,
}: JobDescriptionTabProps) {
  const [draftNotes, setDraftNotes] = useState(notes ?? "");

  // Sync when notes prop changes externally
  useEffect(() => {
    setDraftNotes(notes ?? "");
  }, [notes]);

  const cleanedDescription = useMemo(
    () => (description ? cleanLinkedInMarkup(description) : ""),
    [description],
  );

  const handleSaveNotes = useCallback(() => {
    if (draftNotes !== (notes ?? "") && onSaveNotes) {
      onSaveNotes(draftNotes);
    }
  }, [draftNotes, notes, onSaveNotes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveNotes();
      }
    },
    [handleSaveNotes],
  );

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (!description && !notes) {
    const isLinkedIn = source?.toLowerCase().includes("linkedin");
    return (
      <Center py="xl">
        <Box ta="center">
          <MdDescription size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <Text size="lg" fw={500} mb="xs">
            No Job Description
          </Text>
          <Text size="sm" c="dimmed">
            {isLinkedIn
              ? "The description could not be loaded from LinkedIn. Try opening the job link directly."
              : "Run a search to populate job descriptions."}
          </Text>
        </Box>
      </Center>
    );
  }

  return (
    <Box p="md" style={{ height: "100%", overflow: "auto" }}>
      {/* ── Job Description (read-only markdown) ──────────────────────── */}
      {description && (
        <Paper p="md" withBorder mb="md">
          <Text fw={700} size="sm" mb="xs" tt="uppercase" c="dimmed">
            Job Description
          </Text>
          <Box className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {cleanedDescription}
            </ReactMarkdown>
          </Box>
        </Paper>
      )}

      {/* ── Notes (editable, auto-save on blur) ───────────────────────── */}
      <Paper p="md" withBorder>
        <Text fw={700} size="sm" mb="xs" tt="uppercase" c="dimmed">
          Notes
        </Text>
        <Textarea
          placeholder="Add your notes about this job..."
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.currentTarget.value)}
          onBlur={handleSaveNotes}
          onKeyDown={handleKeyDown}
          minRows={5}
          autosize
          maxRows={20}
        />
        <Text size="xs" c="dimmed" mt="xs">
          Ctrl+S to save
        </Text>
      </Paper>
    </Box>
  );
}
