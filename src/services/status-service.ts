// src/services/status-service.ts
// ---------------------------------------------------------------------------
// Status service — job status transitions and history.
// Previously handled by status-ipc.ts in the Electron main process.
// ---------------------------------------------------------------------------

import type Database from "@tauri-apps/plugin-sql";
import { getDb } from "./database";
import { acquireWriteLock } from "./write-lock";
import { statusHistory as statusHistoryTable } from "../shared/db-migrations";
import type { StatusHistoryEntry } from "../shared/types";
import type { z } from "zod/v4";

const statusHistorySchema = statusHistoryTable.schema;
type StatusHistoryRow = z.infer<typeof statusHistorySchema>;

export async function updateJobStatus(
  db: Database,
  jobId: string,
  fromStatus: string,
  toStatus: string,
  notes?: string,
): Promise<boolean> {
  const rows = await db.select<Array<{ status: string }>>("SELECT status FROM jobs WHERE id = $1", [
    jobId,
  ]);

  if (rows.length === 0) return false;
  const current = rows[0].status;

  // Guard: status must match expected fromStatus
  if (current !== fromStatus) {
    return false;
  }

  const release = await acquireWriteLock();
  try {
    await db.execute("BEGIN TRANSACTION");
    await db.execute("UPDATE jobs SET status = $1 WHERE id = $2", [toStatus, jobId]);
    await db.execute(
      `INSERT INTO status_history (job_id, from_status, to_status, notes)
       VALUES ($1, $2, $3, $4)`,
      [jobId, fromStatus, toStatus, notes ?? null],
    );
    await db.execute("COMMIT");
  } catch (_e) {
    await db.execute("ROLLBACK");
    throw _e;
  } finally {
    release();
  }

  return true;
}

export async function getStatusHistory(db: Database, jobId: string): Promise<StatusHistoryEntry[]> {
  const rawRows = await db.select<unknown[]>(
    `SELECT id, job_id, from_status, to_status, notes, changed_at
     FROM status_history WHERE job_id = $1
     ORDER BY changed_at DESC`,
    [jobId],
  );

  return rawRows.map((raw) => {
    const row: StatusHistoryRow = statusHistorySchema.parse(raw);
    return {
      id: row.id,
      jobId: row.job_id,
      fromStatus: row.from_status ?? "",
      toStatus: row.to_status ?? "",
      notes: row.notes ?? null,
      changedAt: row.changed_at,
    };
  });
}

export async function updateJobNotes(db: Database, jobId: string, notes: string): Promise<boolean> {
  await db.execute("UPDATE jobs SET notes = $1 WHERE id = $2", [notes, jobId]);
  return true;
}

// Convenience wrappers
export async function updateJobStatusAuto(
  jobId: string,
  fromStatus: string,
  toStatus: string,
  notes?: string,
): Promise<boolean> {
  return updateJobStatus(await getDb(), jobId, fromStatus, toStatus, notes);
}

export async function getStatusHistoryAuto(jobId: string): Promise<StatusHistoryEntry[]> {
  return getStatusHistory(await getDb(), jobId);
}

export async function updateJobNotesAuto(jobId: string, notes: string): Promise<boolean> {
  return updateJobNotes(await getDb(), jobId, notes);
}
