// src/renderer/components/nav/NavPanel.tsx
// ---------------------------------------------------------------------------
// Left navigation panel — lists saved searches with hit/new counts,
// an inbox badge, and a "+ Add Search" button.
// ---------------------------------------------------------------------------

import { useLocation } from "react-router-dom";
import {
  NavLink,
  Stack,
  Button,
  Text,
  Badge,
  Box,
  Group,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import { MdInbox, MdEdit, MdAdd } from "react-icons/md";
import { useSearchList } from "../../hooks/useSearchQueries";
import { useInboxQuery } from "../../hooks/useInboxQueries";
import { useJobSearchStore, SEARCH_ALL_KEY } from "../../stores/jobSearchStore";
import { SearchModal } from "../search/SearchModal";

interface NavPanelProps {
  /** Called when the user clicks a search — navigates to results view. */
  onSelectSearch: (id: string) => void;
  /** Called when the user clicks the inbox — navigates to inbox view. */
  onSelectInbox: () => void;
}

export function NavPanel({ onSelectSearch, onSelectInbox }: NavPanelProps) {
  const location = useLocation();
  const { data: searches, isLoading } = useSearchList();
  const activeSearchId = useJobSearchStore((s) => s.activeSearchId);
  const searchRuns = useJobSearchStore((s) => s.searchRuns);
  const openModal = useJobSearchStore((s) => s.openModal);
  const setActiveSearchId = useJobSearchStore((s) => s.setActiveSearchId);

  const { data: inboxJobs = [] } = useInboxQuery();

  const handleSelectSearch = (id: string) => {
    setActiveSearchId(id);
    onSelectSearch(id);
  };

  const handleInbox = () => {
    setActiveSearchId(null);
    onSelectInbox();
  };

  return (
    <Stack gap={0} h="100%" px={0}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <Box p={0}>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
            Job Searches
          </Text>
          <Button size="compact-xs" variant="light" onClick={() => openModal("create")}>
            <MdAdd size={14} /> Add
          </Button>
        </Group>
      </Box>

      {/* ── Inbox ────────────────────────────────────────────────── */}
      <NavLink
        label={
          <Group gap="xs">
            <Badge size="xs" variant="filled" color="blue">
              {inboxJobs.filter((j) => j.isNew).length} new
            </Badge>
            {searchRuns[SEARCH_ALL_KEY] && <Loader size="xs" />}
          </Group>
        }
        leftSection={
          <ThemeIcon
            variant={location.pathname === "/inbox" ? "filled" : "light"}
            size="sm"
            color="cyan.4"
            radius="xl"
          >
            <MdInbox size={14} />
          </ThemeIcon>
        }
        active={location.pathname === "/inbox"}
        onClick={handleInbox}
        styles={{
          root: {
            borderRadius: 8,
          },
        }}
      />

      {/* ── Separator ────────────────────────────────────────────── */}
      <Box px={0} py="xs">
        <Text fw={600} size="xs" c="dimmed">
          Saved Searches
        </Text>
      </Box>

      {/* ── Search list ──────────────────────────────────────────── */}
      {isLoading && (
        <Text size="sm" c="dimmed" px="md" py="xs">
          Loading...
        </Text>
      )}

      {!isLoading && searches?.length === 0 && (
        <Text size="sm" c="dimmed" px="md" py="xs">
          No searches yet.
        </Text>
      )}

      {searches?.map((s) => (
        <NavLink
          key={s.id}
          label={
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" style={{ flex: 1 }} lineClamp={1}>
                {s.title}
              </Text>
              {searchRuns[s.id] && <Loader size="xs" />}
              <Text size="xs" c="dimmed">
                {s.location}
              </Text>
            </Group>
          }
          description={
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                {s.schedule}
              </Text>
              {/* TODO: wire hit/new counts from jobs table (Increment 3-4) */}
            </Group>
          }
          active={activeSearchId === s.id}
          onClick={() => handleSelectSearch(s.id)}
          rightSection={
            <Tooltip label="Edit search">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("edit", s.id);
                }}
              >
                <MdEdit size={14} />
              </ActionIcon>
            </Tooltip>
          }
          styles={{
            root: {
              borderRadius: 0,
            },
          }}
        />
      ))}
      <SearchModal />
    </Stack>
  );
}
