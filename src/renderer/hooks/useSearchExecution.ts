// src/renderer/hooks/useSearchExecution.ts
// ---------------------------------------------------------------------------
// Hooks for invoking search execution and subscribing to stream events.
// Uses Tauri events (emit/listen) instead of Electron IPC.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { useJobSearchStore, SEARCH_ALL_KEY } from "../stores/jobSearchStore";
import { notifications } from "@mantine/notifications";
import type { StreamEvent } from "../../shared/types";
import { runAllSearches, runSingleSearch } from "../../services/search-executor";

/**
 * Hook that returns functions to run searches and automatically
 * subscribes to streaming progress events via Tauri events.
 *
 * Uses per-key search state in the store:
 * - "__all__" for "Search All" runs
 * - searchId for single-search runs
 */
export function useSearchExecution() {
  const startSearchRun = useJobSearchStore((s) => s.startSearchRun);
  const appendSearchLog = useJobSearchStore((s) => s.appendSearchLog);
  const clearSearchRun = useJobSearchStore((s) => s.clearSearchRun);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const subscribeToStream = useCallback(
    (streamId: string, runKey: string) => {
      const channel = `job-search:run-all:stream:${streamId}`;
      listen<StreamEvent>(channel, (event) => {
        const e = event.payload;
        switch (e.type) {
          case "start":
            appendSearchLog(runKey, e.message);
            break;
          case "phase":
            appendSearchLog(runKey, e.message);
            break;
          case "chunk":
            if (e.content) appendSearchLog(runKey, e.content);
            break;
          case "done":
            clearSearchRun(runKey);
            notifications.show({
              title: "Search complete",
              message: e.summary,
              color: "green",
            });
            break;
          case "error":
            clearSearchRun(runKey);
            notifications.show({
              title: "Search error",
              message: e.message,
              color: "red",
            });
            break;
        }
      }).then((unlisten) => {
        unsubscribeRef.current = unlisten;
      });
    },
    [appendSearchLog, clearSearchRun],
  );

  const runAll = useCallback(async () => {
    startSearchRun(SEARCH_ALL_KEY);
    appendSearchLog(SEARCH_ALL_KEY, "Starting search...");

    // Subscribe to the stream ID notification first
    const unsubStreamId = await listen<string>("job-search:stream-id", (event) => {
      subscribeToStream(event.payload, SEARCH_ALL_KEY);
    });

    try {
      await runAllSearches();
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err) {
      console.error("[search-execution] runAll failed:", err);
      clearSearchRun(SEARCH_ALL_KEY);
    }

    unsubStreamId();
  }, [appendSearchLog, startSearchRun, clearSearchRun, subscribeToStream, queryClient]);

  const runSingle = useCallback(
    async (searchId: string) => {
      startSearchRun(searchId);
      appendSearchLog(searchId, "Starting search...");

      const streamId = crypto.randomUUID();
      const channel = `job-search:run-all:stream:${streamId}`;
      subscribeToStream(streamId, searchId);

      try {
        await runSingleSearch(searchId, channel);
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } catch (err) {
        console.error("[search-execution] runSingle failed:", err);
        clearSearchRun(searchId);
      }
    },
    [appendSearchLog, startSearchRun, clearSearchRun, subscribeToStream, queryClient],
  );

  return { runAll, runSingle };
}
