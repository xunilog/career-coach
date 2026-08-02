// src/renderer/components/job-detail/ResearchTab.tsx
// ---------------------------------------------------------------------------
// Displays company research sections with real-time streaming content.
// ---------------------------------------------------------------------------

import { Box, Button, Text, Stack, Loader, Center, Paper } from "@mantine/core";
import { MdScience } from "react-icons/md";
import { useResearchQuery, useResearchMutation } from "../../hooks/useResearchQueries";

interface ResearchTabProps {
  jobId: string;
  company: string;
  jobTitle: string;
}

const SECTION_LABELS: Record<string, string> = {
  overview: "Company Overview",
  culture: "Culture & Work Environment",
  news: "Latest News",
  keyPeople: "Key People & Leadership",
  market: "Market Position",
};

export function ResearchTab({ jobId, company, jobTitle }: ResearchTabProps) {
  const { data: research, isLoading } = useResearchQuery(jobId);
  const { isResearching, chunks, phase, startResearch } = useResearchMutation();

  const hasResearch =
    research &&
    (research.overview ||
      research.culture ||
      research.news ||
      research.keyPeople ||
      research.market);

  return (
    <Box p="md" style={{ height: "100%", overflow: "auto" }}>
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <Button
        onClick={() => startResearch(jobId, company, jobTitle)}
        loading={isResearching}
        leftSection={<MdScience size={16} />}
        mb="md"
      >
        {hasResearch ? "Re-run Research" : "Research Company"}
      </Button>

      {isResearching && phase && (
        <Text size="sm" c="dimmed" mb="sm">
          {phase}
        </Text>
      )}

      {/* ── Loading ───────────────────────────────────────────────── */}
      {isLoading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      {/* ── Streaming chunks ──────────────────────────────────────── */}
      {isResearching &&
        chunks.map((chunk, i) => (
          <Paper key={i} p="sm" mb="sm" withBorder>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {chunk}
            </Text>
          </Paper>
        ))}

      {/* ── Stored research ────────────────────────────────────────── */}
      {!isResearching && hasResearch && (
        <Stack gap="md">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const content = (research as unknown as Record<string, unknown>)[key];
            if (!content) return null;
            return (
              <Paper key={key} p="md" withBorder>
                <Text fw={700} size="sm" mb="xs" tt="uppercase" c="dimmed">
                  {label}
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {typeof content === "string"
                    ? content
                    : typeof content === "number"
                      ? String(content)
                      : ""}
                </Text>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!isLoading && !isResearching && !hasResearch && (
        <Center py="xl">
          <Box ta="center">
            <Text size="xl" mb="sm">
              🔬
            </Text>
            <Text size="lg" fw={500} mb="xs">
              No research yet
            </Text>
            <Text size="sm" c="dimmed">
              Click "Research Company" to gather information about {company}.
            </Text>
          </Box>
        </Center>
      )}
    </Box>
  );
}
