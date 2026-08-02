// src/renderer/components/job-detail/JobDetailView.tsx
// ---------------------------------------------------------------------------
// Split-panel job detail: editor tabs (left) + chat (right).
// Tab bar: Job Desc / Research / Resume / Cover.
// Toolbar: generate/export/re-score actions (context-aware).
// Marks job as seen on enter.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Divider,
  Grid,
  Tabs,
  Text,
  Group,
  Badge,
  Loader,
  Center,
  Button,
  ActionIcon,
  Paper,
  useMantineTheme,
} from "@mantine/core";
import { useViewportSize, useElementSize } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

import { open } from "@tauri-apps/plugin-shell";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useJobDetailQuery, useMarkSeen } from "../../hooks/useJobQueries";
import { useSearch } from "../../hooks/useSearchQueries";
import { useResearchQuery } from "../../hooks/useResearchQueries";
import { useUpdateStatus, useUpdateNotes, useStatusHistory } from "../../hooks/useStatusQueries";
import { useQueryClient } from "@tanstack/react-query";
import {
  useResumeQuery,
  useCoverLetterQuery,
  resumeKey,
  coverKey,
} from "../../hooks/useGenerationQueries";
import { getDb } from "../../../services/database";
import { getJobById } from "../../../services/job-service";

import { useLayoutStore } from "../../stores/layoutStore";
import { JobDescriptionTab } from "./JobDescriptionTab";
import { ResearchTab } from "./ResearchTab";
import { ResumeTab } from "./ResumeTab";
import { CoverLetterTab } from "./CoverLetterTab";
import { CoachChatPanel } from "../chat/CoachChatPanel";
import { useCareerStore } from "../../stores/careerStore";
import { StatusDropdown } from "./StatusDropdown";
import { StatusHistoryPanel } from "./StatusHistoryPanel";
import { ExportToolbar } from "./ExportToolbar";
import type { DocumentType } from "../../../shared/types";

type TabValue = "description" | "research" | "resume" | "cover";

interface JobDetailViewProps {
  jobId: string;
  searchId: string;
  onClose?: () => void;
}

export function JobDetailView({ jobId, searchId, onClose }: JobDetailViewProps) {
  const { data: job, isLoading, isError } = useJobDetailQuery(jobId);
  const { data: search } = useSearch(searchId);
  const { data: research } = useResearchQuery(jobId);
  const markSeen = useMarkSeen();
  const updateStatus = useUpdateStatus();
  const updateNotes = useUpdateNotes();
  const { data: statusHistory = [], isLoading: isHistoryLoading } = useStatusHistory(jobId);
  const { data: resumeDoc } = useResumeQuery(jobId);
  const { data: coverDoc } = useCoverLetterQuery(jobId);

  const [activeTab, setActiveTab] = useState<TabValue>("description");
  // ── Layout measurements (same pattern as ProfileEditor) ─────────────
  const appHeaderHeight = useLayoutStore((s) => s.appHeaderHeight);
  const { height: viewportH } = useViewportSize();
  const { ref: jobHeaderRef, height: jobHeaderH } = useElementSize({ box: "border-box" });
  const { ref: tabsRef, height: tabsH } = useElementSize({ box: "border-box" });
  const colH = `calc(${viewportH}px - ${appHeaderHeight}px)`;
  const contentH = `calc(${colH} - ${jobHeaderH}px - ${tabsH}px)`;
  const theme = useMantineTheme();
  const queryClient = useQueryClient();
  const setJobContext = useCareerStore((s) => s.setJobContext);
  const documentUpdatedAt = useCareerStore((s) => s.documentUpdatedAt);

  // Mark job as seen when entering the view
  useEffect(() => {
    if (jobId) {
      markSeen.mutate(jobId);
    }
  }, [jobId]);

  // Build company research string for chat context
  const companyResearchStr = research
    ? [research.overview, research.culture, research.news, research.keyPeople, research.market]
        .filter(Boolean)
        .join("\n\n")
    : null;

  const documentType: DocumentType | null =
    activeTab === "resume" ? "resume" : activeTab === "cover" ? "cover" : null;

  // Keep job context in sync for the chat's system prompt
  useEffect(() => {
    if (!jobId) return;
    const content =
      documentType === "resume"
        ? (resumeDoc?.content ?? null)
        : documentType === "cover"
          ? (coverDoc?.content ?? null)
          : null;
    setJobContext({
      jobId,
      jobDescription: job?.description ?? null,
      companyResearch: companyResearchStr,
      documentType,
      documentContent: content,
    });
  }, [
    jobId,
    job?.description,
    companyResearchStr,
    documentType,
    resumeDoc?.content,
    coverDoc?.content,
    setJobContext,
  ]);

  // Invalidate document query cache when the chat agent updates a document
  useEffect(() => {
    if (documentUpdatedAt > 0 && jobId && documentType) {
      const key = documentType === "resume" ? resumeKey(jobId) : coverKey(jobId);
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [documentUpdatedAt, jobId, documentType, queryClient]);

  const handleBack = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (!jobId || !job) return;
      updateStatus.mutate(
        { jobId, fromStatus: job.status, toStatus: newStatus },
        {
          onSuccess: () => {
            notifications.show({
              title: "Status updated",
              message: `Changed to "${newStatus}"`,
              color: "green",
            });
          },
          onError: (err) => {
            notifications.show({
              title: "Status update failed",
              message: err.message,
              color: "red",
            });
          },
        },
      );
    },
    [jobId, job, updateStatus],
  );

  const handleSaveNotes = useCallback(
    (newNotes: string) => {
      if (!jobId) return;
      updateNotes.mutate({ jobId, notes: newNotes });
    },
    [jobId, updateNotes],
  );

  // ── Export callbacks ─────────────────────────────────────────────
  const exportDocumentType: "resume" | "cover" = activeTab === "cover" ? "cover" : "resume";
  const hasDocument = exportDocumentType === "resume" ? !!resumeDoc?.content : !!coverDoc?.content;

  const handleExportPdf = useCallback(() => {
    // PDF export via browser print (Tauri webview supports window.print())
    window.print();
  }, []);

  const handleCopy = useCallback(async () => {
    const content = exportDocumentType === "resume" ? resumeDoc?.content : coverDoc?.content;
    if (!content) {
      notifications.show({
        title: "Nothing to copy",
        message: "No document content",
        color: "yellow",
      });
      return;
    }
    try {
      await writeText(content);
      notifications.show({
        title: "Copied",
        message: "Content copied to clipboard",
        color: "blue",
      });
    } catch {
      notifications.show({ title: "Copy failed", message: "Could not copy content", color: "red" });
    }
  }, [exportDocumentType, resumeDoc, coverDoc]);

  const handleOpenUrl = useCallback(async () => {
    if (!jobId) return;
    try {
      const db = await getDb();
      const job = await getJobById(db, jobId);
      if (job?.applyUrl) {
        await open(job.applyUrl);
      }
    } catch {
      notifications.show({ title: "Error", message: "Could not open apply URL", color: "red" });
    }
  }, [jobId]);

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Center py="xl" style={{ height: "100%" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // ── Error / not found state ────────────────────────────────────────
  if (isError || !job) {
    return (
      <Center py="xl" style={{ height: "100%" }}>
        <Box ta="center">
          <Text size="xl" mb="sm">
            ❌
          </Text>
          <Text size="lg" fw={500} mb="xs">
            Job Not Found
          </Text>
          <Text size="sm" c="dimmed" mb="lg">
            This job may have been deleted or the link is invalid.
          </Text>
          <Button onClick={handleBack} variant="outline">
            ← Back
          </Button>
        </Box>
      </Center>
    );
  }

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Header / Toolbar ────────────────────────────────────────── */}
      <Paper ref={jobHeaderRef} p="sm" withBorder>
        <Group justify="space-between" wrap="wrap">
          <Group gap="sm" wrap="wrap">
            <ActionIcon variant="subtle" onClick={handleBack} size="lg" title="Back to results">
              ←
            </ActionIcon>
            <Box>
              <Text size="lg" fw={700} lineClamp={1}>
                {job.title}
              </Text>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  {job.company}
                </Text>
                {job.location && (
                  <Text size="sm" c="dimmed">
                    • {job.location}
                  </Text>
                )}
                {job.salary && (
                  <Badge variant="light" size="sm">
                    {job.salary}
                  </Badge>
                )}
                {job.fit && (
                  <Badge
                    color={
                      job.fit === "High"
                        ? "green"
                        : job.fit === "Medium"
                          ? "yellow"
                          : job.fit === "Low"
                            ? "orange"
                            : "gray"
                    }
                    size="sm"
                  >
                    {job.fit}
                  </Badge>
                )}
              </Group>
            </Box>
          </Group>

          <Group gap="xs">
            <StatusDropdown
              currentStatus={job.status}
              onChange={handleStatusChange}
              disabled={updateStatus.isPending}
            />
            <ExportToolbar
              documentType={exportDocumentType}
              hasDocument={hasDocument}
              hasApplyUrl={!!job.applyUrl}
              onExportPdf={handleExportPdf}
              onCopy={handleCopy}
              onOpenUrl={handleOpenUrl}
            />
            {search && (
              <Text size="xs" c="dimmed">
                Search: {search.title}
              </Text>
            )}
          </Group>
        </Group>
      </Paper>

      {/* ── Tabs + Two-Column Content ────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as TabValue)}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <Tabs.List ref={tabsRef}>
          <Tabs.Tab value="description">📋 Job Desc</Tabs.Tab>
          <Tabs.Tab value="research">🔬 Research</Tabs.Tab>
          <Tabs.Tab value="resume">📄 Resume</Tabs.Tab>
          <Tabs.Tab value="cover">✉️ Cover</Tabs.Tab>
        </Tabs.List>

        <Box style={{ overflow: "hidden" }}>
          <Grid gap={0} h={contentH}>
            {/* Left: Tab content + Status History */}
            <Grid.Col span={7}>
              <Box
                h={contentH}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Box style={{ flex: 1, overflow: "hidden" }}>
                  <Tabs.Panel value="description" style={{ height: "100%" }}>
                    <JobDescriptionTab
                      description={job.description}
                      notes={job.notes}
                      onSaveNotes={handleSaveNotes}
                      source={job.source}
                    />
                  </Tabs.Panel>

                  <Tabs.Panel value="research" style={{ height: "100%" }}>
                    <ResearchTab jobId={job.id} company={job.company} jobTitle={job.title} />
                  </Tabs.Panel>

                  <Tabs.Panel value="resume" style={{ height: "100%" }}>
                    <ResumeTab jobId={job.id} />
                  </Tabs.Panel>

                  <Tabs.Panel value="cover" style={{ height: "100%" }}>
                    <CoverLetterTab jobId={job.id} />
                  </Tabs.Panel>
                </Box>

                <Box px="md" pb="md">
                  <StatusHistoryPanel history={statusHistory} isLoading={isHistoryLoading} />
                </Box>
              </Box>
            </Grid.Col>

            {/* Right: Chat Panel */}
            <Grid.Col span={5}>
              <Box h={contentH} style={{ display: "flex", alignItems: "stretch" }}>
                <Divider orientation="vertical" />
                <Box style={{ flex: 1 }}>
                  <CoachChatPanel
                    coachType={`job:${job.id}`}
                    forceAgent="job"
                    colH={contentH}
                    themeSpacing={theme.spacing.md}
                    emptyStateText="Discuss this job and your application materials with the AI coach."
                    placeholder="Ask about this job, company, or your application..."
                  />
                </Box>
              </Box>
            </Grid.Col>
          </Grid>
        </Box>
      </Tabs>
    </Box>
  );
}
