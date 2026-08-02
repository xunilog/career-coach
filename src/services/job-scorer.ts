// src/services/job-scorer.ts
// ---------------------------------------------------------------------------
// JobScorer — batch-scores jobs against the user's profile using an LLM.
// No database access — pure LLM calls.
// Moved from src/main/job-scorer.ts (was better-sqlite3 context).
// ---------------------------------------------------------------------------

import { z } from "zod/v4";
import { getModel } from "../shared/llm-provider";
import type { JobPosting, ScoredJob, Fit } from "../shared/types";

const MAX_BATCH_SIZE = 10;

const ScoreResultSchema = z.object({
  jobIndex: z.number(),
  fit: z.enum(["High", "Medium", "Low", "Skip"]),
  reason: z.string(),
});

const ScoreResultsSchema = z.object({
  scores: z.array(ScoreResultSchema),
});

type ScoreResults = z.infer<typeof ScoreResultsSchema>;

function buildScoringPrompt(jobs: JobPosting[], profile: string): string {
  const jobSummaries = jobs
    .map(
      (j, i) =>
        `[${i}] ${j.title} at ${j.company}\nLocation: ${j.location ?? "N/A"}\nDescription: ${(j.description ?? "N/A").slice(0, 500)}`,
    )
    .join("\n\n");

  return `You are a job fit evaluator. Given a candidate's profile and a list of job postings, rate each job as "High", "Medium", "Low", or "Skip" fit.

Profile:
${profile}

Jobs:
${jobSummaries}

Fit definitions:
- High: Strong match — profile aligns well with requirements and responsibilities.
- Medium: Partial match — some relevant skills but gaps exist.
- Low: Weak match — significant gaps between profile and requirements.
- Skip: Not a fit — profile does not match this role at all.`;
}

export async function scoreBatch(jobs: JobPosting[], profile: string): Promise<ScoredJob[]> {
  if (jobs.length === 0) return [];
  if (jobs.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size exceeds maximum of ${MAX_BATCH_SIZE}`);
  }

  const model = await getModel(0.3, undefined, "lite");
  const structuredModel = model.withStructuredOutput(ScoreResultsSchema);
  const prompt = buildScoringPrompt(jobs, profile);
  console.log(`[job-scorer] invoking — jobCount=${jobs.length} promptLength=${prompt.length}`);

  try {
    const { scores }: ScoreResults = await structuredModel.invoke(prompt);
    console.log(`[job-scorer] response — scored ${scores.length} jobs`);

    return scores.map((r) => ({
      jobId: jobs[r.jobIndex]?.id ?? "",
      fit: r.fit as Fit,
      reason: r.reason,
      jobIndex: r.jobIndex,
    }));
  } catch (err) {
    console.error("[job-scorer] First attempt failed:", err);

    try {
      console.log("[job-scorer] Retrying...");
      const { scores }: ScoreResults = await structuredModel.invoke(prompt);
      console.log(`[job-scorer] retry succeeded — scored ${scores.length} jobs`);
      return scores.map((r) => ({
        jobId: jobs[r.jobIndex]?.id ?? "",
        fit: r.fit as Fit,
        reason: r.reason,
        jobIndex: r.jobIndex,
      }));
    } catch (retryErr) {
      console.error("[job-scorer] Retry also failed:", retryErr);
      return jobs.map((j) => ({
        jobId: j.id,
        fit: "Medium" as Fit,
        reason: "Scoring failed — defaulting to Medium",
        jobIndex: 0,
      }));
    }
  }
}

export async function scoreAllUnscored(jobs: JobPosting[], profile: string): Promise<ScoredJob[]> {
  const unscored = jobs.filter((j) => !j.fit);

  if (unscored.length === 0) return [];

  const results: ScoredJob[] = [];

  for (let i = 0; i < unscored.length; i += MAX_BATCH_SIZE) {
    const batch = unscored.slice(i, i + MAX_BATCH_SIZE);
    const batchResults = await scoreBatch(batch, profile);
    results.push(...batchResults);
  }

  return results;
}
