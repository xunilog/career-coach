// src/renderer/hooks/useJobQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for per-search results and job detail.
// Data flows through services → @tauri-apps/plugin-sql → SQLite.
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { JobPosting } from "../../shared/types";
import { getDb } from "../../services/database";
import { getJobsForSearch, getJobById, markAsSeen, markAllSeen } from "../../services/job-service";
import { scoreAllUnscored } from "../../services/job-scorer";
import { getProfile } from "../../services/career-data-service";

const JOBS_KEY = ["jobs"] as const;

function searchJobsKey(searchId: string) {
  return [...JOBS_KEY, "search", searchId] as const;
}

function jobDetailKey(jobId: string) {
  return [...JOBS_KEY, "detail", jobId] as const;
}

export function useSearchResultsQuery(searchId: string | null, showAll = false) {
  return useQuery<JobPosting[]>({
    queryKey: [...searchJobsKey(searchId ?? ""), { showAll }],
    queryFn: async () => {
      if (!searchId) return [];
      const db = await getDb();
      return getJobsForSearch(db, searchId, showAll);
    },
    enabled: !!searchId,
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useJobDetailQuery(jobId: string | null) {
  return useQuery<JobPosting | null>({
    queryKey: jobDetailKey(jobId ?? ""),
    queryFn: async () => {
      if (!jobId) return null;
      const db = await getDb();
      return (await getJobById(db, jobId)) ?? null;
    },
    enabled: !!jobId,
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useMarkSeen() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: async (jobId) => {
      const db = await getDb();
      await markAsSeen(db, jobId);
      return { ok: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

export function useMarkAllSeen() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: async (searchId) => {
      const db = await getDb();
      await markAllSeen(db, searchId);
      return { ok: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

export function useScoreSearch() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: async (searchId) => {
      const db = await getDb();
      const profileRow = await getProfile(db);
      const profile = profileRow?.markdown ?? null;
      if (!profile) return { ok: false };

      const allJobs = await getJobsForSearch(db, searchId, true);
      const unscored = allJobs.filter((j) => !j.fit);
      if (unscored.length === 0) return { ok: true };

      const results = await scoreAllUnscored(unscored, profile);

      await db.execute("BEGIN TRANSACTION");
      try {
        for (const r of results) {
          await db.execute("UPDATE jobs SET fit = $1 WHERE id = $2 AND search_id = $3", [
            r.fit,
            r.jobId,
            searchId,
          ]);
        }
        await db.execute("COMMIT");
      } catch (_e) {
        await db.execute("ROLLBACK");
        throw _e;
      }
      return { ok: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}
