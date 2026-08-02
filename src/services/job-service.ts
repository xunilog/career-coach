// src/services/job-service.ts
// ---------------------------------------------------------------------------
// JobService — async operations on the `jobs` table via @tauri-apps/plugin-sql.
//
// Adapted from src/main/job-service.ts (was better-sqlite3 sync).
// ---------------------------------------------------------------------------

import type Database from "@tauri-apps/plugin-sql";
import type { JobPosting, JobResult, Fit, JobStatus } from "../shared/types";
import { jobs as jobsTable } from "../shared/db-migrations";
import type { z } from "zod/v4";
import { computeDedupKey } from "../shared/dedup-key";

const jobsSchema = jobsTable.schema;
type JobRow = z.infer<typeof jobsSchema>;

function rowToJob(row: JobRow): JobPosting {
  return {
    id: row.id,
    searchId: row.search_id,
    title: row.title,
    company: row.company,
    location: row.location ?? null,
    salary: row.salary ?? null,
    fit: (row.fit as Fit) ?? null,
    source: row.source ?? "unknown",
    applyUrl: row.apply_url ?? null,
    foundAt: row.found_at ?? "",
    status: (row.status as JobStatus) ?? "--",
    description: row.description ?? null,
    notes: row.notes ?? null,
    isNew: row.is_new === 1,
  };
}

export async function mergeJobResults(
  db: Database,
  searchId: string,
  jobs: JobResult[],
): Promise<{ newCount: number; reopenedCount: number }> {
  console.log(`[job-service] mergeJobResults: searchId=${searchId} jobCount=${jobs.length}`);
  let newCount = 0;
  let reopenedCount = 0;

  for (const job of jobs) {
    const dedupKey = computeDedupKey(job.company, job.title, job.location, job.source);

    // Match by content hash first — the stable identity across scrape runs.
    const byDedup = await db.select<Array<{ id: string; status: string }>>(
      "SELECT id, status FROM jobs WHERE dedup_key = $1",
      [dedupKey],
    );

    // Use the existing row's id when matched by content, otherwise the scraper's id.
    // This prevents id PK conflicts: the same scraper id with changed content
    // falls through to ON CONFLICT(id) update; the same content with a different
    // scraper id reuses the existing row's id.
    const effectiveId = byDedup.length > 0 ? byDedup[0].id : job.id;

    if (byDedup.length === 0) {
      newCount++;
    } else if (byDedup[0].status === "Closed 🔒") {
      reopenedCount++;
      await db.execute("UPDATE jobs SET status = $1 WHERE id = $2", ["--", effectiveId]);
      await db.execute(
        `INSERT INTO status_history (job_id, from_status, to_status, notes, changed_at)
         VALUES ($1, $2, $3, $4, datetime('now'))`,
        [effectiveId, "Closed 🔒", "--", "Reopened: job found again in search results"],
      );
    }

    await db.execute(
      `INSERT INTO jobs (id, dedup_key, search_id, title, company, location, salary, source, apply_url, found_at, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, datetime('now'), $10)
       ON CONFLICT(id) DO UPDATE SET
         dedup_key = excluded.dedup_key,
         search_id = excluded.search_id,
         title = excluded.title,
         company = excluded.company,
         location = excluded.location,
         salary = excluded.salary,
         source = excluded.source,
         apply_url = excluded.apply_url,
         found_at = excluded.found_at,
         is_new = 1,
         description = COALESCE(NULLIF(excluded.description, ''), jobs.description)`,
      [
        effectiveId,
        dedupKey,
        searchId,
        job.title,
        job.company,
        job.location || null,
        job.salary || null,
        job.source,
        job.applyUrl || null,
        job.description || null,
      ],
    );
  }
  console.log(`[job-service] mergeJobResults done: new=${newCount} reopened=${reopenedCount}`);

  return { newCount, reopenedCount };
}

export async function autoCloseMissingJobs(
  db: Database,
  searchId: string,
  currentDedupKeys: Set<string>,
): Promise<number> {
  const closeableRows = await db.select<Array<{ id: string; dedup_key: string; status: string }>>(
    `SELECT id, dedup_key, status FROM jobs
     WHERE search_id = $1 AND status IN ('--', 'Saved')`,
    [searchId],
  );

  const toClose = closeableRows.filter((j) => !currentDedupKeys.has(j.dedup_key));

  if (toClose.length === 0) {
    console.log(
      `[job-service] autoCloseMissingJobs: nothing to close (closeable=${closeableRows.length})`,
    );
    return 0;
  }

  console.log(
    `[job-service] autoCloseMissingJobs: closing ${toClose.length} jobs (closeable=${closeableRows.length} current=${currentDedupKeys.size})`,
  );

  for (const job of toClose) {
    await db.execute("UPDATE jobs SET status = $1 WHERE id = $2", ["Closed 🔒", job.id]);
    await db.execute(
      `INSERT INTO status_history (job_id, from_status, to_status, notes, changed_at)
       VALUES ($1, $2, $3, $4, datetime('now'))`,
      [job.id, job.status, "Closed 🔒", "Auto-closed: job no longer found in search results"],
    );
  }
  console.log(`[job-service] autoCloseMissingJobs done: closed=${toClose.length}`);

  return toClose.length;
}

export async function getJobsForSearch(
  db: Database,
  searchId: string,
  showAll = false,
): Promise<JobPosting[]> {
  let query = "SELECT * FROM jobs WHERE search_id = $1";
  if (!showAll) {
    query += " AND status IN ('--', 'Saved', 'Applied 📤', 'Interview 🤝')";
  }
  query += " ORDER BY found_at DESC";

  const rawRows = await db.select<unknown[]>(query, [searchId]);
  return rawRows.map((raw) => rowToJob(jobsSchema.parse(raw)));
}

export async function getJobById(db: Database, jobId: string): Promise<JobPosting | undefined> {
  const rows = await db.select<unknown[]>("SELECT * FROM jobs WHERE id = $1", [jobId]);
  if (rows.length === 0) return undefined;
  return rowToJob(jobsSchema.parse(rows[0]));
}

export async function deleteJobsBySearchId(db: Database, searchId: string): Promise<number> {
  const rows = await db.select<Array<{ id: string }>>("SELECT id FROM jobs WHERE search_id = $1", [
    searchId,
  ]);
  if (rows.length === 0) return 0;

  for (const row of rows) {
    await db.execute("DELETE FROM status_history WHERE job_id = $1", [row.id]);
  }
  await db.execute("DELETE FROM jobs WHERE search_id = $1", [searchId]);
  return rows.length;
}

export async function markAsSeen(db: Database, jobId: string): Promise<void> {
  await db.execute("UPDATE jobs SET is_new = 0 WHERE id = $1", [jobId]);
}

export async function backfillDedupKeys(db: Database): Promise<number> {
  const rows = await db.select<
    Array<{ id: string; company: string; title: string; location: string | null; source: string }>
  >("SELECT id, company, title, location, source FROM jobs WHERE dedup_key IS NULL");

  for (const row of rows) {
    const key = computeDedupKey(row.company, row.title, row.location ?? "", row.source);
    await db.execute("UPDATE jobs SET dedup_key = $1 WHERE id = $2", [key, row.id]);
  }

  return rows.length;
}

export async function markAllSeen(db: Database, searchId: string): Promise<void> {
  await db.execute("UPDATE jobs SET is_new = 0 WHERE search_id = $1", [searchId]);
}

export async function getInboxJobs(db: Database): Promise<(JobPosting & { searchName: string })[]> {
  const rawRows = await db.select<unknown[]>(
    `SELECT j.*, s.title as search_name
     FROM jobs j
     JOIN searches s ON j.search_id = s.id
     WHERE j.status IN ('--', 'Saved', 'Applied 📤', 'Interview 🤝')
     ORDER BY j.found_at DESC`,
  );

  return rawRows.map((raw) => {
    const row = jobsSchema.parse(raw);
    return {
      ...rowToJob(row),
      searchName: (raw as { search_name: string }).search_name,
    };
  });
}
