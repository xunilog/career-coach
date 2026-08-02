// src/renderer/components/inbox/InboxView.tsx
// ---------------------------------------------------------------------------
// Full-width virtualized table of aggregated ✨ new results across all searches.
// Toolbar stays fixed at top; only the job list scrolls.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Text, Badge, Button, Group, Box, Center, Skeleton, Stack } from "@mantine/core";
import { useViewportSize, useElementSize } from "@mantine/hooks";
import { MdInbox, MdSearch } from "react-icons/md";
import { useInboxQuery, type InboxJob } from "../../hooks/useInboxQueries";
import { useMarkSeen } from "../../hooks/useJobQueries";
import { useSearchExecution } from "../../hooks/useSearchExecution";
import { useJobSearchStore, inboxViewStateKey, SEARCH_ALL_KEY } from "../../stores/jobSearchStore";
import { SearchLogBox } from "../shared/SearchLogBox";
import { VirtualTable } from "../shared/VirtualTable";
import type { VirtualTableColumn } from "../shared/VirtualTable";
import { useLayoutStore } from "../../stores/layoutStore";
import { JobDetailOverlay } from "../job-detail/JobDetailOverlay";

const inboxColumns: VirtualTableColumn<InboxJob>[] = [
  {
    key: "searchName",
    label: "Search",
    width: "140px",
    sortable: true,
    render: (job) => (
      <Text size="sm" c="dimmed">
        {job.searchName}
      </Text>
    ),
  },
  {
    key: "title",
    label: "Job Title",
    grow: 1,
    sortable: true,
    render: (job) => (
      <Group gap="xs">
        <Text size="sm" fw={job.isNew ? 700 : 500} fs={job.isNew ? "italic" : undefined}>
          {job.title}
        </Text>
      </Group>
    ),
  },
  {
    key: "company",
    label: "Company",
    width: "160px",
    sortable: true,
    render: (job) => <Text size="sm">{job.company}</Text>,
  },
  {
    key: "fit",
    label: "Fit",
    width: "80px",
    sortable: true,
    render: (job) => <FitBadge fit={job.fit} />,
  },
  {
    key: "foundAt",
    label: "Date Found",
    width: "110px",
    sortable: true,
    render: (job) => (
      <Text size="xs" c="dimmed">
        {new Date(job.foundAt).toLocaleDateString()}
      </Text>
    ),
  },
];

export function InboxView() {
  const { data: jobs, isLoading, isError, error } = useInboxQuery();
  const markSeen = useMarkSeen();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  const { runAll } = useSearchExecution();
  const searchRuns = useJobSearchStore((s) => s.searchRuns);
  const isSearching = searchRuns[SEARCH_ALL_KEY] !== undefined;
  const searchLogs = searchRuns[SEARCH_ALL_KEY]?.logs ?? [];
  const viewStates = useJobSearchStore((s) => s.viewStates);
  const setViewState = useJobSearchStore((s) => s.setViewState);

  const inboxKey = inboxViewStateKey();
  const savedState = viewStates[inboxKey];

  const [sortField, setSortField] = useState<string | null>(savedState?.sortField ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(savedState?.sortDir ?? "asc");

  // Persist sort state
  useEffect(() => {
    setViewState(inboxKey, { sortField, sortDir });
  }, [sortField, sortDir, inboxKey, setViewState]);

  const { ref: headerRef, height: headerH } = useElementSize({ box: "border-box" });
  const appHeaderHeight = useLayoutStore((s) => s.appHeaderHeight);
  const { height: viewportH } = useViewportSize();
  const wrapperH =
    viewportH > 0 && headerH > 0
      ? `calc(${viewportH}px - ${appHeaderHeight}px - ${headerH}px - 2 * var(--mantine-spacing-md))`
      : undefined;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Client-side sort (same pattern as ResultsView)
  const sortedJobs = jobs
    ? [...jobs].sort((a, b) => {
        if (!sortField) return 0;
        const aVal = (a as unknown as Record<string, unknown>)[sortField];
        const bVal = (b as unknown as Record<string, unknown>)[sortField];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const aStr =
          typeof aVal === "string" || typeof aVal === "number" || typeof aVal === "boolean"
            ? String(aVal)
            : "";
        const bStr =
          typeof bVal === "string" || typeof bVal === "number" || typeof bVal === "boolean"
            ? String(bVal)
            : "";
        const cmp = aStr.localeCompare(bStr);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : [];

  return (
    <Box
      p="md"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        position: "relative",
      }}
    >
      {/* ── Toolbar — fixed at top ────────────────────────────────── */}
      <Box ref={headerRef}>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <MdInbox size={24} />
            <Text size="xl" fw={700}>
              Inbox
            </Text>
            {jobs && jobs.filter((j) => j.isNew).length > 0 && (
              <Badge size="lg" variant="light" color="blue">
                {jobs.filter((j) => j.isNew).length} new
              </Badge>
            )}
          </Group>
          <Button onClick={runAll} loading={isSearching} leftSection={<MdSearch size={16} />}>
            Search All
          </Button>
        </Group>

        <SearchLogBox logs={searchLogs} isSearching={isSearching} />
      </Box>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {isLoading && (
        <Stack gap="xs" py="md">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={36} radius="sm" />
          ))}
        </Stack>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {isError && (
        <Center py="xl">
          <Text c="red">Failed to load inbox: {(error as Error).message}</Text>
        </Center>
      )}

      {/* ── Empty ─────────────────────────────────────────────────── */}
      {!isLoading && !isError && jobs?.length === 0 && (
        <Center py="xl">
          <Box ta="center">
            <MdInbox size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <Text size="lg" fw={500} mb="xs">
              No jobs in inbox
            </Text>
            <Text size="sm" c="dimmed">
              Click "Search All" to run your saved searches and find jobs.
            </Text>
          </Box>
        </Center>
      )}

      {/* ── Virtualized job list — scrolls internally ──────────────── */}
      {sortedJobs.length > 0 && (
        <Box
          style={{
            flex: "0 0 auto",
            height: wrapperH ?? undefined,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <VirtualTable
            data={sortedJobs}
            columns={inboxColumns}
            getRowKey={(job) => job.id}
            rowStyle={(job) => ({
              fontWeight: job.isNew ? 700 : 400,
              fontStyle: job.isNew ? "italic" : "normal",
            })}
            onRowClick={(job) => {
              markSeen.mutate(job.id);
              setSelectedJobId(job.id);
              setSelectedSearchId(job.searchId);
            }}
            striped
            highlightOnHover
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </Box>
      )}

      {/* ── Job Detail Overlay ──────────────────────────────────────── */}
      {selectedJobId && selectedSearchId && (
        <JobDetailOverlay
          jobId={selectedJobId}
          searchId={selectedSearchId}
          onClose={() => {
            setSelectedJobId(null);
            setSelectedSearchId(null);
          }}
        />
      )}
    </Box>
  );
}

/** Color-coded fit badge. */
function FitBadge({ fit }: { fit: string | null }) {
  if (!fit || fit === "--")
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );

  const colorMap: Record<string, string> = {
    High: "green",
    Medium: "yellow",
    Low: "orange",
    Skip: "red",
  };

  return (
    <Badge size="sm" variant="light" color={colorMap[fit] ?? "gray"}>
      {fit}
    </Badge>
  );
}
