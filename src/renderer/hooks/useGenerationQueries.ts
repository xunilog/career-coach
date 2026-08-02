// src/renderer/hooks/useGenerationQueries.ts
// ---------------------------------------------------------------------------
// TanStack Query hooks for resume/cover letter generation.
// Calls services directly (no IPC needed in Tauri).
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getDb } from "../../services/database";
import { generateDocument } from "../../services/generation-graph";
import type { AdaptedResume, CoverLetter, DocumentType, StreamEvent } from "../../shared/types";

const GEN_KEY = ["generation"] as const;

export function resumeKey(jobId: string) {
  return [...GEN_KEY, "resume", jobId] as const;
}

export function coverKey(jobId: string) {
  return [...GEN_KEY, "cover", jobId] as const;
}

async function getDocument(jobId: string, table: string): Promise<AdaptedResume | null> {
  const db = await getDb();
  const rows = await db.select<Array<Record<string, unknown>>>(
    `SELECT * FROM ${table} WHERE job_id = $1`,
    [jobId],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    jobId: row.job_id as string,
    content: row.content as string | null,
    atsScore: row.ats_score as number | null,
    humanScore: row.human_score as number | null,
    iterations: row.iterations as number | null,
    generatedAt: row.generated_at as string | null,
    updatedAt: row.updated_at as string | null,
  };
}

export function useResumeQuery(jobId: string | null) {
  return useQuery<AdaptedResume | null>({
    queryKey: resumeKey(jobId ?? ""),
    queryFn: () => (jobId ? getDocument(jobId, "adapted_resumes") : null),
    enabled: !!jobId,
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCoverLetterQuery(jobId: string | null) {
  return useQuery<CoverLetter | null>({
    queryKey: coverKey(jobId ?? ""),
    queryFn: () => (jobId ? getDocument(jobId, "cover_letters") : null),
    enabled: !!jobId,
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export interface GenerationStreamState {
  isGenerating: boolean;
  chunks: string[];
  phase: string | null;
  atsScore: number | null;
  humanScore: number | null;
  iteration: number | null;
  atsFeedback: string[] | null;
  humanFeedback: string[] | null;
  personalizationSuggestions: string[] | null;
  error: string | null;
}

const EMPTY_STREAM_STATE: GenerationStreamState = {
  isGenerating: false,
  chunks: [],
  phase: null,
  atsScore: null,
  humanScore: null,
  iteration: null,
  atsFeedback: null,
  humanFeedback: null,
  personalizationSuggestions: null,
  error: null,
};

export function useGenerateMutation(documentType: DocumentType) {
  const queryClient = useQueryClient();
  const [streamState, setStreamState] = useState<GenerationStreamState>(EMPTY_STREAM_STATE);

  const startGeneration = useCallback(
    async (jobId: string, rescoreOnly = false) => {
      setStreamState({
        ...EMPTY_STREAM_STATE,
        isGenerating: true,
        phase: `Starting ${documentType === "resume" ? "resume" : "cover letter"} generation...`,
      });

      try {
        const result = await generateDocument(
          jobId,
          documentType,
          rescoreOnly,
          (event: StreamEvent) => {
            setStreamState((prev) => {
              switch (event.type) {
                case "start":
                  return { ...prev, isGenerating: true, phase: event.message, error: null };
                case "phase":
                  return { ...prev, phase: event.message };
                case "chunk":
                  return { ...prev, chunks: [event.content] };
                case "score":
                  return {
                    ...prev,
                    atsScore: event.atsScore,
                    humanScore: event.humanScore,
                    iteration: event.iteration,
                  };
                case "feedback":
                  return {
                    ...prev,
                    atsFeedback: event.atsFeedback ?? prev.atsFeedback,
                    humanFeedback: event.humanFeedback ?? prev.humanFeedback,
                  };
                case "personalization":
                  return { ...prev, personalizationSuggestions: event.suggestions };
                case "done":
                  return { ...prev, isGenerating: false, phase: event.summary };
                case "error":
                  return { ...prev, isGenerating: false, error: event.message };
                default:
                  return prev;
              }
            });
          },
        );

        // Invalidate query cache so useResumeQuery / useCoverLetterQuery refetch
        const cacheKey = documentType === "resume" ? resumeKey(jobId) : coverKey(jobId);
        void queryClient.invalidateQueries({ queryKey: cacheKey });

        setStreamState((prev) => ({
          ...prev,
          isGenerating: false,
          atsScore: result.atsScore,
          humanScore: result.humanScore,
          iteration: result.iterations,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed";
        setStreamState((prev) => ({ ...prev, isGenerating: false, error: message }));
      }
    },
    [documentType, queryClient],
  );

  return { ...streamState, startGeneration };
}

export function useSaveResume(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (content: string) => {
      if (!jobId) return;
      const db = await getDb();
      await db.execute(
        `INSERT INTO adapted_resumes (job_id, content, updated_at)
         VALUES ($1, $2, datetime('now'))
         ON CONFLICT(job_id) DO UPDATE SET
           content = excluded.content,
           updated_at = excluded.updated_at`,
        [jobId, content],
      );
    },
    onSuccess: () => {
      if (jobId) void queryClient.invalidateQueries({ queryKey: resumeKey(jobId) });
    },
  });
}

export function useSaveCover(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (content: string) => {
      if (!jobId) return;
      const db = await getDb();
      await db.execute(
        `INSERT INTO cover_letters (job_id, content, updated_at)
         VALUES ($1, $2, datetime('now'))
         ON CONFLICT(job_id) DO UPDATE SET
           content = excluded.content,
           updated_at = excluded.updated_at`,
        [jobId, content],
      );
    },
    onSuccess: () => {
      if (jobId) void queryClient.invalidateQueries({ queryKey: coverKey(jobId) });
    },
  });
}
