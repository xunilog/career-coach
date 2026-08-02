// src/renderer/hooks/useInboxQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for the aggregated inbox view.
// ---------------------------------------------------------------------------

import { useQuery } from "@tanstack/react-query";
import type { JobPosting } from "../../shared/types";
import { getDb } from "../../services/database";
import { getInboxJobs } from "../../services/job-service";

export interface InboxJob extends JobPosting {
  searchName: string;
}

export function useInboxQuery() {
  return useQuery<InboxJob[]>({
    queryKey: ["jobs", "inbox"],
    queryFn: async () => {
      const db = await getDb();
      const jobs = await getInboxJobs(db);
      return jobs as InboxJob[];
    },
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
