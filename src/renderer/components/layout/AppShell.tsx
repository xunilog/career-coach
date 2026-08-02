// src/components/layout/AppShell.tsx
// ---------------------------------------------------------------------------
// Mantine AppShell — sidebar navigation + header + main content area.
// Includes DueSearchesBanner for scheduler startup notifications.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { AppShell, Group, Title, Image, Box, Menu, ActionIcon } from "@mantine/core";
import { useElementSize, useDisclosure } from "@mantine/hooks";
import { MdSettings } from "react-icons/md";
import { listen } from "@tauri-apps/api/event";
import { CareerNavbar } from "./Navbar";
import { ApiKeyModal } from "./ApiKeyModal";
import { DueSearchesBanner } from "../shared/DueSearchesBanner";
import { useSearchExecution } from "../../hooks/useSearchExecution";
import { useJobSearchStore, SEARCH_ALL_KEY } from "../../stores/jobSearchStore";
import { useLayoutStore } from "../../stores/layoutStore";

interface DueSearchInfo {
  id: string;
  title: string;
}

interface DueSearchesPayload {
  count: number;
  searches: DueSearchInfo[];
}

export function AppShellLayout() {
  const [duePayload, setDuePayload] = useState<DueSearchesPayload | null>(null);
  const [apiKeyModalOpened, { open: openApiKeyModal, close: closeApiKeyModal }] =
    useDisclosure(false);
  const { runAll } = useSearchExecution();
  const searchRuns = useJobSearchStore((s) => s.searchRuns);
  const isSearching = searchRuns[SEARCH_ALL_KEY] !== undefined;
  const setAppHeaderHeight = useLayoutStore((s) => s.setAppHeaderHeight);

  const { ref: headerRef, height: measuredHeaderH } = useElementSize({ box: "border-box" });

  useEffect(() => {
    if (measuredHeaderH > 0) setAppHeaderHeight(measuredHeaderH);
  }, [measuredHeaderH, setAppHeaderHeight]);

  // Listen for due-searches notification via Tauri events
  useEffect(() => {
    const unlisten = listen<DueSearchesPayload>("scheduler:due-searches", (event) => {
      setDuePayload(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleRunNow = useCallback(() => {
    runAll();
  }, [runAll]);

  const handleDismiss = useCallback(() => {
    setDuePayload(null);
  }, []);

  return (
    <AppShell navbar={{ width: 280, breakpoint: "sm" }} header={{ height: 56 }} padding={0}>
      <AppShell.Header ref={headerRef}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Image src="/logo.png" alt="Career Coach" w={28} h={28} fit="contain" />
            <Title order={3}>Career Coach</Title>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="lg">
                <MdSettings size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<MdSettings size={16} />} onClick={openApiKeyModal}>
                API Keys
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <CareerNavbar />
      </AppShell.Navbar>

      <ApiKeyModal opened={apiKeyModalOpened} onClose={closeApiKeyModal} />
      <AppShell.Main style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {duePayload && (
          <Box px="md" pt="md">
            <DueSearchesBanner
              count={duePayload.count}
              searches={duePayload.searches}
              onRunNow={handleRunNow}
              onDismiss={handleDismiss}
              isRunning={isSearching}
            />
          </Box>
        )}
        <Box
          style={{
            display: "flex",
            flex: "1 1 0%",
            minHeight: "0px",
            height: "100%", // Parent must have a height
          }}
        >
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
