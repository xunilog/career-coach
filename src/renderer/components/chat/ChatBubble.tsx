// src/components/chat/ChatBubble.tsx
// ---------------------------------------------------------------------------
// Single chat message bubble. Uses Mantine's Paper + theming.
// Renders coach responses as HTML from markdown via react-markdown.
// ---------------------------------------------------------------------------

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Paper, Group, Text, ThemeIcon, Collapse, UnstyledButton } from "@mantine/core";
import {
  MdPsychology,
  MdExplore,
  MdWork,
  MdDescription,
  MdPerson,
  MdSmartToy,
} from "react-icons/md";

const ICON_SIZE = 14;

const CHAT_MARKDOWN_COMPONENTS: Components = {
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
          background: "var(--mantine-color-dark-7)",
          padding: "1px 5px",
          borderRadius: 4,
          fontSize: "0.9em",
        }}
      >
        {children}
      </code>
    );
  },
  ul: ({ children }) => <ul style={{ paddingLeft: "1.4em", margin: "0.3em 0" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: "1.4em", margin: "0.3em 0" }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: "0.2em 0" }}>{children}</li>,
  table: ({ children }) => (
    <table
      style={{ width: "100%", borderCollapse: "collapse", margin: "0.5em 0", fontSize: "0.9em" }}
    >
      {children}
    </table>
  ),
  thead: ({ children }) => (
    <thead style={{ background: "var(--mantine-color-dark-7)" }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      style={{
        border: "1px solid var(--mantine-color-dark-4)",
        padding: "0.4em 0.7em",
        textAlign: "left",
        fontWeight: 700,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ border: "1px solid var(--mantine-color-dark-4)", padding: "0.3em 0.7em" }}>
      {children}
    </td>
  ),
  del: ({ children }) => <del style={{ opacity: 0.6 }}>{children}</del>,
  h1: ({ children }) => (
    <Text component="h3" fw={700} size="md" style={{ margin: "0.6em 0 0.3em" }}>
      {children}
    </Text>
  ),
  h2: ({ children }) => (
    <Text component="h4" fw={700} size="sm" style={{ margin: "0.5em 0 0.3em" }}>
      {children}
    </Text>
  ),
  h3: ({ children }) => (
    <Text component="h5" fw={700} size="sm" style={{ margin: "0.4em 0 0.2em" }}>
      {children}
    </Text>
  ),
  hr: () => (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--mantine-color-dark-4)",
        margin: "0.8em 0",
      }}
    />
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: "3px solid var(--mantine-color-dark-4)",
        paddingLeft: "0.8em",
        margin: "0.4em 0",
        opacity: 0.9,
      }}
    >
      {children}
    </blockquote>
  ),
};

const AGENT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  router: { icon: <MdPsychology size={ICON_SIZE} />, label: "Career Coach", color: "#c4a882" },
  profile: { icon: <MdExplore size={ICON_SIZE} />, label: "Profile Coach", color: "#5b9ec9" },
  experience: { icon: <MdWork size={ICON_SIZE} />, label: "Experience Coach", color: "#4caf78" },
  resume: { icon: <MdDescription size={ICON_SIZE} />, label: "Resume Coach", color: "#c9537b" },
  human: { icon: <MdPerson size={ICON_SIZE} />, label: "You", color: "#60a5fa" },
  ai: { icon: <MdSmartToy size={ICON_SIZE} />, label: "Coach", color: "#a78bfa" },
};

interface ChatBubbleProps {
  message: { type: string; content: string; reasoningContent?: string };
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isHuman = message.type === "human";
  const meta = AGENT_META[message.type] ?? AGENT_META[message.type === "ai" ? "ai" : "router"];
  const hasReasoning = !!message.reasoningContent;
  const [reasoningOpen, setReasoningOpen] = useState(false);

  // Strip JSON routing blocks for display
  const rawContent =
    typeof message.content === "string" ? message.content : String(message.content ?? "");
  const cleanContent = rawContent
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/\{"next"\s*:\s*"\w+"\}/g, "")
    .trim();

  return (
    <Group justify={isHuman ? "flex-end" : "flex-start"} align="flex-start" gap="sm" wrap="nowrap">
      {!isHuman && (
        <ThemeIcon variant="light" radius="xl" size="md" style={{ flexShrink: 0, marginTop: 4 }}>
          {meta.icon}
        </ThemeIcon>
      )}

      <Paper
        shadow="xs"
        radius={isHuman ? "lg" : "lg"}
        p="sm"
        style={{
          maxWidth: "75%",
          borderTopRightRadius: isHuman ? "4px" : undefined,
          borderTopLeftRadius: isHuman ? undefined : "4px",
          background: isHuman ? "var(--mantine-color-blue-9)" : "var(--mantine-color-dark-6)",
        }}
      >
        {!isHuman && (
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            style={{ color: meta.color, marginBottom: 4, letterSpacing: 1 }}
          >
            {meta.label}
          </Text>
        )}

        {/* Reasoning section (collapsible, collapsed by default) */}
        {hasReasoning && (
          <div style={{ marginBottom: 8 }}>
            <UnstyledButton
              onClick={() => setReasoningOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                opacity: 0.7,
                fontSize: "0.8em",
                cursor: "pointer",
              }}
            >
              <MdPsychology size={12} />
              <Text size="xs" span>
                Reasoning {reasoningOpen ? "▲" : "▼"}
              </Text>
            </UnstyledButton>
            <Collapse expanded={reasoningOpen}>
              <Text
                size="xs"
                c="dimmed"
                fs="italic"
                style={{
                  marginTop: 4,
                  paddingLeft: 4,
                  borderLeft: "2px solid var(--mantine-color-dark-4)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.reasoningContent}
              </Text>
            </Collapse>
          </div>
        )}

        <div
          style={{
            fontSize: "var(--mantine-font-size-sm)",
            lineHeight: 1.6,
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={CHAT_MARKDOWN_COMPONENTS}>
            {cleanContent}
          </ReactMarkdown>
        </div>
      </Paper>

      {isHuman && (
        <ThemeIcon
          variant="light"
          radius="xl"
          size="md"
          color="blue"
          style={{ flexShrink: 0, marginTop: 4 }}
        >
          <MdPerson size={14} />
        </ThemeIcon>
      )}
    </Group>
  );
}
