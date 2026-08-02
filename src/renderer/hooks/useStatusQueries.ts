// src/renderer/hooks/useStatusQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for application status tracking.
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StatusHistoryEntry } from "../../shared/types";
import {
  updateJobStatusAuto,
  getStatusHistoryAuto,
  updateJobNotesAuto,
} from "../../services/status-service";

const JOBS_KEY = ["jobs"] as const;

interface UpdateStatusInput {
  jobId: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, UpdateStatusInput>({
    mutationFn: async ({ jobId, fromStatus, toStatus, notes }) => ({
      success: await updateJobStatusAuto(jobId, fromStatus, toStatus, notes),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

export function useStatusHistory(jobId: string | null) {
  return useQuery<StatusHistoryEntry[]>({
    queryKey: [...JOBS_KEY, "statusHistory", jobId ?? ""],
    queryFn: async () => {
      if (!jobId) return [];
      return getStatusHistoryAuto(jobId);
    },
    enabled: !!jobId,
    staleTime: 10_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

interface UpdateNotesInput {
  jobId: string;
  notes: string;
}

export function useUpdateNotes() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, UpdateNotesInput>({
    mutationFn: async ({ jobId, notes }) => ({
      success: await updateJobNotesAuto(jobId, notes),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}
