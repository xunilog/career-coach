// src/renderer/hooks/useResearchQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for company research.
// Calls researchCompany() directly (no IPC needed in Tauri).
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "../../services/database";
import type { CompanyResearch, StreamEvent } from "../../shared/types";
import { researchCompany } from "../../services/company-researcher";

const RESEARCH_KEY = ["research"] as const;

function researchKey(jobId: string) {
  return [...RESEARCH_KEY, jobId] as const;
}

/** Fetch existing research for a job from SQLite. */
export function useResearchQuery(jobId: string | null) {
  return useQuery<CompanyResearch | null>({
    queryKey: researchKey(jobId ?? ""),
    queryFn: async () => {
      if (!jobId) return null;
      const db = await getDb();
      const rows = await db.select<Array<CompanyResearch>>(
        "SELECT * FROM research WHERE job_id = $1",
        [jobId],
      );
      return rows.length > 0 ? rows[0] : null;
    },
    enabled: !!jobId,
    staleTime: 60_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Mutation-like hook for starting company research.
 * Manages streaming state for real-time content display.
 */
export function useResearchMutation() {
  const queryClient = useQueryClient();
  const [streamState, setStreamState] = useState<{
    isResearching: boolean;
    chunks: string[];
    phase: string | null;
  }>({ isResearching: false, chunks: [], phase: null });

  const startResearch = useCallback(
    async (jobId: string, company: string, jobTitle: string) => {
      setStreamState({ isResearching: true, chunks: [], phase: null });

      try {
        const result = await researchCompany(company, jobTitle, {
          onEvent: (event: StreamEvent) => {
            setStreamState((prev) => {
              switch (event.type) {
                case "phase":
                  return { ...prev, phase: event.message };
                case "chunk":
                  return {
                    ...prev,
                    chunks: [...prev.chunks, event.content],
                  };
                case "done":
                  return { ...prev, isResearching: false };
                case "error":
                  return { ...prev, isResearching: false };
                default:
                  return prev;
              }
            });
          },
        });

        // Save research result to SQLite
        const db = await getDb();
        await db.execute(
          `INSERT INTO research (job_id, overview, culture, news, key_people, market, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, datetime('now'))
           ON CONFLICT(job_id) DO UPDATE SET
             overview = excluded.overview,
             culture = excluded.culture,
             news = excluded.news,
             key_people = excluded.key_people,
             market = excluded.market,
             generated_at = excluded.generated_at`,
          [jobId, result.overview, result.culture, result.news, result.keyPeople, result.market],
        );

        void queryClient.invalidateQueries({ queryKey: researchKey(jobId) });
      } catch (err) {
        console.error("[research] start failed:", err);
        setStreamState((prev) => ({ ...prev, isResearching: false }));
      }
    },
    [queryClient],
  );

  return { ...streamState, startResearch };
}
