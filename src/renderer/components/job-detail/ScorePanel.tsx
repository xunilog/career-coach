// src/renderer/components/job-detail/ScorePanel.tsx
// ---------------------------------------------------------------------------
// Collapsible score panel showing ATS Match %, Human Authenticity %,
// score trend arrows, expandable feedback per round, and personalization
// suggestions. Also includes a "Re-Score" button.
// ---------------------------------------------------------------------------

import { useState } from "react";
import {
  Box,
  Text,
  Button,
  Group,
  Progress,
  Badge,
  Paper,
  Stack,
  ThemeIcon,
  ActionIcon,
} from "@mantine/core";
import {
  MdRefresh,
  MdExpandLess,
  MdExpandMore,
  MdBarChart,
  MdCheckCircle,
  MdWarning,
} from "react-icons/md";

interface ScorePanelProps {
  atsScore: number | null;
  humanScore: number | null;
  iteration: number | null;
  atsFeedback: string[] | null;
  humanFeedback: string[] | null;
  personalizationSuggestions: string[] | null;
  isGenerating: boolean;
  onReScore?: () => void;
}

// Thresholds per spec: ATS ≥ 85, Human ≥ 80
const ATS_THRESHOLD = 85;
const HUMAN_THRESHOLD = 80;

function ScoreBadge({
  label,
  score,
  threshold,
}: {
  label: string;
  score: number | null;
  threshold: number;
}) {
  if (score === null) return null;

  const passed = score >= threshold;
  const color = passed ? "green" : "orange";

  return (
    <Group gap="xs" align="center">
      <Text size="sm" fw={600} w={180}>
        {label}
      </Text>
      <Progress value={score} color={color} size="lg" style={{ flex: 1 }} animated={!passed} />
      <Badge color={color} variant="filled" size="lg">
        {score}% {passed ? <MdCheckCircle size={14} /> : <MdWarning size={14} />}
      </Badge>
    </Group>
  );
}

export function ScorePanel({
  atsScore,
  humanScore,
  iteration,
  atsFeedback,
  humanFeedback,
  personalizationSuggestions,
  isGenerating,
  onReScore,
}: ScorePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);

  const hasScores = atsScore !== null || humanScore !== null;
  const hasFeedback = atsFeedback !== null || humanFeedback !== null;
  const hasPersonalization =
    personalizationSuggestions !== null && personalizationSuggestions.length > 0;

  if (!hasScores && !hasFeedback && !hasPersonalization) {
    return null;
  }

  return (
    <Paper
      p="sm"
      withBorder
      mb="md"
      style={{ borderLeft: "3px solid var(--mantine-color-blue-filled)" }}
    >
      {/* ── Header row with toggle ──────────────────────────────────── */}
      <Group justify="space-between" mb={hasScores ? "sm" : 0}>
        <Group gap="xs">
          <MdBarChart size={16} />
          <Text size="sm" fw={700}>
            Scores
          </Text>
          {iteration !== null && (
            <Badge variant="light" size="sm">
              Iteration {iteration}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          {onReScore && (
            <Button
              size="xs"
              variant="light"
              leftSection={<MdRefresh size={14} />}
              onClick={onReScore}
              loading={isGenerating}
            >
              Re-Score
            </Button>
          )}
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            {expanded ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
          </ActionIcon>
        </Group>
      </Group>

      {/* ── Score bars ──────────────────────────────────────────────── */}
      {hasScores && (
        <Stack gap="xs" mb={expanded && hasFeedback ? "sm" : 0}>
          <ScoreBadge label="ATS Match" score={atsScore} threshold={ATS_THRESHOLD} />
          <ScoreBadge label="Human Authenticity" score={humanScore} threshold={HUMAN_THRESHOLD} />
        </Stack>
      )}

      {/* ── Expandable feedback ──────────────────────────────────────── */}
      {expanded && (
        <>
          {hasFeedback && (
            <Box mt="sm">
              <Group
                gap="xs"
                mb="xs"
                onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                style={{ cursor: "pointer" }}
              >
                <Text size="xs" fw={600} c="dimmed">
                  {feedbackExpanded ? "▼" : "▶"} Feedback Details
                </Text>
              </Group>

              {feedbackExpanded && (
                <Stack gap="xs" ml="md">
                  {atsFeedback &&
                    atsFeedback.map((fb, i) => (
                      <Group key={`ats-${i}`} gap="xs" align="flex-start">
                        <ThemeIcon size="xs" color="orange" variant="light" radius="xl">
                          <Text size="xs">!</Text>
                        </ThemeIcon>
                        <Text size="xs">{fb}</Text>
                      </Group>
                    ))}
                  {humanFeedback &&
                    humanFeedback.map((fb, i) => (
                      <Group key={`human-${i}`} gap="xs" align="flex-start">
                        <ThemeIcon size="xs" color="blue" variant="light" radius="xl">
                          <Text size="xs">i</Text>
                        </ThemeIcon>
                        <Text size="xs">{fb}</Text>
                      </Group>
                    ))}
                </Stack>
              )}
            </Box>
          )}

          {/* ── Personalization suggestions ──────────────────────────────── */}
          {hasPersonalization && (
            <Box mt="sm">
              <Text size="xs" fw={600} c="dimmed" mb="xs">
                💡 Personalization Suggestions
              </Text>
              <Stack gap="xs" ml="md">
                {personalizationSuggestions!.map((suggestion, i) => (
                  <Text key={i} size="xs">
                    • {suggestion}
                  </Text>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
