// src/services/search-executor.ts
// ---------------------------------------------------------------------------
// SearchExecutor — orchestrates single-search runs end-to-end:
// read search → call job search → merge results → score new jobs →
// update last_run_at.
//
// Adapted from src/main/search-executor.ts:
// - Uses Tauri events (emit/listen) instead of Electron sender.send
// - Uses async DB access via tauri-plugin-sql
// ---------------------------------------------------------------------------

import { v4 as uuid } from "uuid";
import { emit } from "@tauri-apps/api/event";
import { getDb } from "./database";
import { getSearch } from "./search-service";
import { buildSearchState, searchJobs } from "./jobspy-client";
import { mergeJobResults, getJobsForSearch, autoCloseMissingJobs } from "./job-service";
import { scoreAllUnscored } from "./job-scorer";
import { getProfile } from "./career-data-service";
import { computeDedupKey } from "../shared/dedup-key";
import type { StreamEvent } from "../shared/types";

async function scoreJobsForSearch(searchId: string, eventChannel: string): Promise<void> {
  const db = await getDb();
  const profileRow = await getProfile(db);
  const profile = profileRow?.markdown ?? null;

  if (!profile) {
    await emit(eventChannel, {
      type: "phase",
      phase: "scoring",
      message: "Skipping scoring — add a profile to enable job scoring",
    } as StreamEvent);
    return;
  }

  await emit(eventChannel, {
    type: "phase",
    phase: "scoring",
    message: "Scoring jobs against your profile...",
  } as StreamEvent);

  const allJobs = await getJobsForSearch(db, searchId, true);
  const unscored = allJobs.filter((j) => !j.fit);

  if (unscored.length === 0) {
    await emit(eventChannel, {
      type: "chunk",
      phase: "scoring",
      content: "All jobs already scored.",
    } as StreamEvent);
    return;
  }

  const results = await scoreAllUnscored(unscored, profile);

  // Write scores back
  for (const r of results) {
    await db.execute("UPDATE jobs SET fit = $1 WHERE id = $2 AND search_id = $3", [
      r.fit,
      r.jobId,
      searchId,
    ]);
  }

  await emit(eventChannel, {
    type: "chunk",
    phase: "scoring",
    content: `Scored ${results.length} jobs.`,
  } as StreamEvent);
}

export async function runSingleSearch(
  searchId: string,
  eventChannel: string,
): Promise<{ total: number; new: number }> {
  console.log(`[search-executor] runSingleSearch start: searchId=${searchId}`);
  const db = await getDb();
  const search = await getSearch(db, searchId);
  if (!search) {
    const errorEvent: StreamEvent = {
      type: "error",
      message: `Search not found: ${searchId}`,
    };
    await emit(eventChannel, errorEvent);
    throw new Error(`Search not found: ${searchId}`);
  }

  const state = buildSearchState(search);
  console.log(
    `[search-executor] built search state: title="${state.title}" location="${state.location}"`,
  );

  await emit(eventChannel, {
    type: "start",
    message: `Searching: ${search.title} in ${search.location}`,
  } as StreamEvent);

  try {
    console.log(`[search-executor] calling searchJobs...`);
    const t0 = performance.now();
    const results = await searchJobs(state);
    console.log(
      `[search-executor] searchJobs returned ${results.length} results in ${(performance.now() - t0).toFixed(0)}ms`,
    );

    console.log(`[search-executor] calling mergeJobResults...`);
    const t1 = performance.now();
    const { newCount, reopenedCount: reopened } = await mergeJobResults(db, searchId, results);
    console.log(
      `[search-executor] mergeJobResults done: new=${newCount} reopened=${reopened} (${(performance.now() - t1).toFixed(0)}ms)`,
    );
    const totalJobs = results.length;

    console.log(`[search-executor] calling autoCloseMissingJobs...`);
    const t2 = performance.now();
    const closedCount = await autoCloseMissingJobs(
      db,
      searchId,
      new Set(results.map((r) => computeDedupKey(r.company, r.title, r.location, r.source))),
    );
    console.log(
      `[search-executor] autoCloseMissingJobs done: closed=${closedCount} (${(performance.now() - t2).toFixed(0)}ms)`,
    );

    await emit(eventChannel, {
      type: "chunk",
      phase: "searching",
      content: `Found ${totalJobs} jobs (${newCount} new, ${reopened} reopened, ${closedCount} closed).`,
    } as StreamEvent);

    console.log(`[search-executor] calling scoreJobsForSearch...`);
    const t3 = performance.now();
    await scoreJobsForSearch(searchId, eventChannel);
    console.log(
      `[search-executor] scoreJobsForSearch done (${(performance.now() - t3).toFixed(0)}ms)`,
    );

    console.log(`[search-executor] updating last_run_at...`);
    await db.execute("UPDATE searches SET last_run_at = datetime('now') WHERE id = $1", [searchId]);

    const doneEvent: StreamEvent = {
      type: "done",
      summary: `Search complete: ${totalJobs} total, ${newCount} new, ${reopened} reopened, ${closedCount} closed`,
    };
    await emit(eventChannel, doneEvent);

    console.log(`[search-executor] runSingleSearch complete: total=${totalJobs} new=${newCount}`);
    return { total: totalJobs, new: newCount };
  } catch (err) {
    console.error(`[search-executor] runSingleSearch failed:`, err);
    const errorEvent: StreamEvent = {
      type: "error",
      message: `Search failed: ${(err as Error).message}`,
    };
    await emit(eventChannel, errorEvent);
    throw err;
  }
}

export async function runAllSearches(): Promise<
  Array<{ searchId: string; total: number; new: number }>
> {
  const db = await getDb();
  const streamId = uuid();
  const channel = `job-search:run-all:stream:${streamId}`;

  await emit("job-search:stream-id", streamId);

  const rows = await db.select<Array<{ id: string }>>(
    "SELECT id FROM searches ORDER BY created_at ASC",
  );

  const results: Array<{ searchId: string; total: number; new: number }> = [];

  for (let i = 0; i < rows.length; i++) {
    const { id } = rows[i];

    await emit(channel, {
      type: "phase",
      phase: "searching",
      message: `Search ${i + 1}/${rows.length}`,
    } as StreamEvent);

    try {
      const result = await runSingleSearch(id, channel);
      results.push({ searchId: id, ...result });
    } catch (err) {
      console.error(`[search-executor] Search ${id} failed:`, err);
    }

    if (i < rows.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}
