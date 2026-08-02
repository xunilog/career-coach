// src/renderer/components/results/ResultsView.tsx
// ---------------------------------------------------------------------------
// Mantine-styled virtualized table for per-search job results.
// Toolbar stays fixed at top; only the job list scrolls.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import {
  Text,
  Badge,
  Button,
  Group,
  Box,
  Center,
  Switch,
  ActionIcon,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import { useViewportSize, useElementSize } from "@mantine/hooks";
import { MdSearch, MdEdit, MdDelete } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import {
  useSearchResultsQuery,
  useMarkAllSeen,
  useScoreSearch,
  useMarkSeen,
} from "../../hooks/useJobQueries";
import { useSearch, useDeleteSearch } from "../../hooks/useSearchQueries";
import { useSearchExecution } from "../../hooks/useSearchExecution";
import { ask } from "@tauri-apps/plugin-dialog";
import { useJobSearchStore, viewStateKey } from "../../stores/jobSearchStore";
import { SearchLogBox } from "../shared/SearchLogBox";
import { VirtualTable } from "../shared/VirtualTable";
import type { VirtualTableColumn } from "../shared/VirtualTable";
import type { JobPosting } from "../../../shared/types";
import { isActive } from "../../../shared/status-transitions";
import { useLayoutStore } from "../../stores/layoutStore";
import { JobDetailOverlay } from "../job-detail/JobDetailOverlay";

export function ResultsView() {
  const { searchId } = useParams<{ searchId: string }>();
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const showAll = useJobSearchStore((s) => s.showAll);
  const setShowAll = useJobSearchStore((s) => s.setShowAll);
  const openModal = useJobSearchStore((s) => s.openModal);
  const searchRuns = useJobSearchStore((s) => s.searchRuns);
  const isSearching = searchId ? searchRuns[searchId] !== undefined : false;
  const searchLogs = searchId ? (searchRuns[searchId]?.logs ?? []) : [];

  const { data: search } = useSearch(searchId ?? null);
  const { data: jobs, isLoading, isError } = useSearchResultsQuery(searchId ?? null, showAll);
  const { runSingle } = useSearchExecution();
  const deleteSearch = useDeleteSearch();
  const markAllSeen = useMarkAllSeen();
  const markSeen = useMarkSeen();
  const scoreSearch = useScoreSearch();

  const { ref: headerRef, height: headerH } = useElementSize({ box: "border-box" });
  const appHeaderHeight = useLayoutStore((s) => s.appHeaderHeight);
  const { height: viewportH } = useViewportSize();
  const wrapperH =
    viewportH > 0 && headerH > 0
      ? `calc(${viewportH}px - ${appHeaderHeight}px - ${headerH}px - 2 * var(--mantine-spacing-md))`
      : undefined;

  // Persisted view state (sort + scroll) for this search
  const viewStates = useJobSearchStore((s) => s.viewStates);
  const setViewState = useJobSearchStore((s) => s.setViewState);
  const viewKey = searchId ? viewStateKey(searchId) : null;
  const savedState = viewKey ? viewStates[viewKey] : undefined;

  const [sortField, setSortField] = useState<string | null>(savedState?.sortField ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(savedState?.sortDir ?? "asc");

  // Reset overlay and restore saved sort when switching searches
  useEffect(() => {
    setSelectedJobId(null);
    const saved = searchId ? viewStates[viewStateKey(searchId)] : undefined;
    setSortField(saved?.sortField ?? null);
    setSortDir(saved?.sortDir ?? "asc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]);

  // Persist sort state whenever it changes
  useEffect(() => {
    if (!viewKey) return;
    setViewState(viewKey, { sortField, sortDir });
  }, [viewKey, sortField, sortDir, setViewState]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleDelete = async () => {
    if (!searchId) return;
    const confirmed = await ask("Delete this search and all its results?", {
      title: "Delete Search",
      kind: "warning",
    });
    if (!confirmed) return;
    await deleteSearch.mutateAsync(searchId);
    void navigate("/");
  };

  const handleSearchNow = () => {
    if (searchId) void runSingle(searchId);
  };

  const handleMarkAllSeen = () => {
    if (searchId) markAllSeen.mutate(searchId);
  };

  // Auto-score unscored jobs when viewing results
  const scoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!searchId || !jobs || jobs.length === 0) return;
    const hasUnscored = jobs.some((j) => !j.fit);
    if (!hasUnscored) return;
    if (scoredRef.current === searchId) return;
    scoredRef.current = searchId;
    scoreSearch.mutate(searchId);
  }, [searchId, jobs]);

  // Sort jobs
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
            <Text size="xl" fw={700}>
              {search?.title ?? "Results"}
            </Text>
            {search && (
              <Text size="sm" c="dimmed">
                {search.location} · {search.schedule}
              </Text>
            )}
          </Group>
          <Group gap="xs">
            <Button
              size="sm"
              variant="light"
              onClick={handleSearchNow}
              loading={isSearching}
              leftSection={<MdSearch size={16} />}
            >
              Search Now
            </Button>
            <Tooltip label="Edit search">
              <ActionIcon variant="subtle" size="lg" onClick={() => openModal("edit", searchId)}>
                <MdEdit size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete search">
              <ActionIcon variant="subtle" size="lg" onClick={handleDelete}>
                <MdDelete size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Group mb="md">
          <Switch
            label="Show All"
            checked={showAll}
            onChange={(e) => setShowAll(e.currentTarget.checked)}
          />
          {jobs && jobs.some((j) => j.isNew) && (
            <Button size="xs" variant="subtle" onClick={handleMarkAllSeen}>
              Mark All Seen
            </Button>
          )}
        </Group>

        <SearchLogBox logs={searchLogs} isSearching={isSearching} />
      </Box>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {isLoading && (
        <Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={16} radius="sm" mb={8} />
          ))}
        </Box>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {isError && (
        <Center py="xl">
          <Text c="red">Failed to load results.</Text>
        </Center>
      )}

      {/* ── Empty ─────────────────────────────────────────────────── */}
      {!isLoading && !isError && sortedJobs.length === 0 && (
        <Center py="xl">
          <Box ta="center">
            <MdSearch size={24} style={{ marginBottom: 8 }} />
            <Text size="lg" fw={500} mb="xs">
              {search ? "No results yet" : "No search selected"}
            </Text>
            <Text size="sm" c="dimmed">
              {search
                ? 'Click "Search Now" to run this search and find matching jobs.'
                : "Select a search from the sidebar or create a new one."}
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
            columns={resultsColumns}
            getRowKey={(job) => job.id}
            onRowClick={(job) => {
              markSeen.mutate(job.id);
              setSelectedJobId(job.id);
            }}
            rowStyle={(job) => ({
              opacity: isActive(job.status) ? 1 : 0.5,
              fontWeight: job.isNew ? 700 : 400,
              fontStyle: job.isNew ? "italic" : "normal",
            })}
            striped
            highlightOnHover
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </Box>
      )}

      {/* ── Job Detail Overlay ──────────────────────────────────────── */}
      {selectedJobId && searchId && (
        <JobDetailOverlay
          jobId={selectedJobId}
          searchId={searchId}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </Box>
  );
}

// ── Column definitions ──────────────────────────────────────────────────────

const resultsColumns: VirtualTableColumn<JobPosting>[] = [
  {
    key: "source",
    label: "Source",
    width: "100px",
    sortable: true,
    render: (job) => <Text size="sm">{job.source}</Text>,
  },
  {
    key: "title",
    label: "Title",
    grow: 1,
    sortable: true,
    render: (job) => (
      <Text size="sm" fw={500}>
        {job.title}
      </Text>
    ),
  },
  {
    key: "location",
    label: "Location",
    width: "140px",
    render: (job) => <Text size="sm">{job.location ?? "—"}</Text>,
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
    render: (job) => {
      if (!job.fit)
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
        <Badge size="sm" variant="light" color={colorMap[job.fit] ?? "gray"}>
          {job.fit}
        </Badge>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    width: "110px",
    sortable: true,
    render: (job) => <Text size="xs">{job.status}</Text>,
  },
];
