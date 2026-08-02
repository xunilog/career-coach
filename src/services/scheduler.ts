// src/services/scheduler.ts
// ---------------------------------------------------------------------------
// JobScheduler — frontend-based scheduler that runs due searches.
//
// Adapted from src/main/scheduler.ts:
// - Uses Tauri events instead of Electron IPC
// - Uses async DB access
// - Runs in the browser context (setInterval in the webview)
// ---------------------------------------------------------------------------

import { emit } from "@tauri-apps/api/event";
import { getDb } from "./database";
import type { SearchDefinition } from "../shared/types";

const TICK_INTERVAL_MS = 60_000;

let intervalId: ReturnType<typeof setInterval> | null = null;
const runningFlag = { isRunning: false };

// ── Due-check query ─────────────────────────────────────────────────────────

export async function getDueSearches(): Promise<SearchDefinition[]> {
  const db = await getDb();
  const rows = await db.select<
    Array<{
      id: string;
      title: string;
      location: string;
      country: string;
      schedule: string;
      created_at: string;
      last_run_at: string | null;
      filters: string;
    }>
  >(
    `SELECT * FROM searches
     WHERE schedule != 'manual'
       AND (
         last_run_at IS NULL
         OR (schedule = 'daily'   AND datetime(last_run_at, '+24 hours')  <= datetime('now'))
         OR (schedule = 'weekly'  AND datetime(last_run_at, '+168 hours') <= datetime('now'))
         OR (schedule = 'monthly' AND datetime(last_run_at, '+720 hours') <= datetime('now'))
       )
     ORDER BY created_at ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    location: row.location,
    country: row.country,
    schedule: row.schedule as SearchDefinition["schedule"],
    createdAt: row.created_at,
    lastRunAt: row.last_run_at,
    filters: JSON.parse(row.filters),
  }));
}

// ── Sequential execution ────────────────────────────────────────────────────

export async function runDueSearches(
  searches: SearchDefinition[],
  executeFn: (search: SearchDefinition) => Promise<void>,
): Promise<void> {
  if (searches.length === 0) return;

  const db = await getDb();

  for (let i = 0; i < searches.length; i++) {
    const search = searches[i];

    try {
      await executeFn(search);
      await db.execute("UPDATE searches SET last_run_at = datetime('now') WHERE id = $1", [
        search.id,
      ]);
    } catch (err) {
      console.error(
        `[scheduler] Search ${search.id} (${search.title}) failed:`,
        (err as Error).message,
      );
    }

    if (i < searches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// ── Tick ────────────────────────────────────────────────────────────────────

export async function tickScheduler(
  executeFn: (search: SearchDefinition) => Promise<void>,
): Promise<void> {
  if (runningFlag.isRunning) {
    console.log("[scheduler] Skipping tick — search already in progress");
    return;
  }

  const due = await getDueSearches();
  if (due.length === 0) return;

  runningFlag.isRunning = true;
  try {
    await runDueSearches(due, executeFn);
  } finally {
    runningFlag.isRunning = false;
  }
}

// ── Scheduler lifecycle ─────────────────────────────────────────────────────

/**
 * Start the scheduler: check for due searches immediately, then tick every 60s.
 * Emits a Tauri event if due searches exist at startup.
 */
export function startScheduler(executeFn: (search: SearchDefinition) => Promise<void>): void {
  stopScheduler();

  // Startup check — emit event if searches are due
  void getDueSearches().then((due) => {
    if (due.length > 0) {
      console.log(`[scheduler] Startup: ${due.length} search(es) due`);
      emit("scheduler:due-searches", due).catch(console.error);
    }
  });

  intervalId = setInterval(() => {
    tickScheduler(executeFn).catch((err) => {
      console.error("[scheduler] Tick error:", err);
    });
  }, TICK_INTERVAL_MS);

  console.log("[scheduler] Started (60s interval)");
}

/** Stop the scheduler interval. */
export function stopScheduler(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[scheduler] Stopped");
  }
}
