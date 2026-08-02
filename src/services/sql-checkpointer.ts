// src/services/sql-checkpointer.ts
// ---------------------------------------------------------------------------
// SqlCheckpointer — implements LangGraph's BaseCheckpointSaver interface
// backed by @tauri-apps/plugin-sql. Stores checkpoints and pending writes in
// the langgraph_checkpoints and langgraph_writes tables.
//
// Adapted from src/shared/sql-checkpointer.ts (was better-sqlite3 sync).
// All DB calls are now async via tauri-plugin-sql with $1, $2, ... params.
// ---------------------------------------------------------------------------

import { BaseCheckpointSaver } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import type Database from "@tauri-apps/plugin-sql";
import type {
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  CheckpointListOptions,
  PendingWrite,
  ChannelVersions,
} from "@langchain/langgraph-checkpoint";
import { getDb } from "./database";

import { acquireWriteLock } from "./write-lock";

export class SqlCheckpointer extends BaseCheckpointSaver {
  private dbPromise: Promise<Database>;

  constructor(db?: Database) {
    super();
    this.dbPromise = db ? Promise.resolve(db) : getDb();
  }

  private async db(): Promise<Database> {
    return this.dbPromise;
  }

  // ── getTuple ──────────────────────────────────────────────────────────

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const db = await this.db();
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs = (config.configurable?.checkpoint_ns as string) ?? "";
    const checkpointId =
      (config.configurable?.checkpoint_id as string) ??
      (await this.getLatestCheckpointId(threadId, checkpointNs));

    if (!checkpointId) return undefined;

    const rows = await db.select<
      Array<{
        checkpoint_id: string;
        parent_checkpoint_id: string | null;
        checkpoint: string;
        metadata: string;
      }>
    >(
      `SELECT checkpoint_id, parent_checkpoint_id, checkpoint, metadata
       FROM langgraph_checkpoints
       WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3`,
      [threadId, checkpointNs, checkpointId],
    );

    if (rows.length === 0) return undefined;
    const row = rows[0];

    const checkpoint: Checkpoint = JSON.parse(row.checkpoint);
    const metadata: CheckpointMetadata = JSON.parse(row.metadata);

    // Load pending writes
    const writeRows = await db.select<
      Array<{
        task_id: string;
        idx: number;
        channel: string;
        value: string;
      }>
    >(
      `SELECT task_id, idx, channel, value
       FROM langgraph_writes
       WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3
       ORDER BY task_id, idx`,
      [threadId, checkpointNs, checkpointId],
    );

    const pendingWrites = writeRows.map(
      (w) => [w.task_id, w.channel, JSON.parse(w.value)] as [string, string, unknown],
    );

    const parentConfig = row.parent_checkpoint_id
      ? {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: row.parent_checkpoint_id,
          },
        }
      : undefined;

    return {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
        },
      },
      checkpoint,
      metadata,
      parentConfig,
      pendingWrites: pendingWrites.length > 0 ? pendingWrites : undefined,
    };
  }

  // ── put ───────────────────────────────────────────────────────────────

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const db = await this.db();
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs = (config.configurable?.checkpoint_ns as string) ?? "";
    const parentCheckpointId = (config.configurable?.checkpoint_id as string) ?? null;

    await db.execute(
      `INSERT OR REPLACE INTO langgraph_checkpoints
         (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        threadId,
        checkpointNs,
        checkpoint.id,
        parentCheckpointId,
        JSON.stringify(checkpoint),
        JSON.stringify(metadata),
      ],
    );

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  // ── putWrites ─────────────────────────────────────────────────────────

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const release = await acquireWriteLock();
    try {
      const db = await this.db();
      const threadId = config.configurable?.thread_id as string;
      const checkpointNs = (config.configurable?.checkpoint_ns as string) ?? "";
      const checkpointId = config.configurable?.checkpoint_id as string;

      for (let idx = 0; idx < writes.length; idx++) {
        const [channel, value] = writes[idx];
        await db.execute(
          `INSERT OR REPLACE INTO langgraph_writes
             (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, value)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [threadId, checkpointNs, checkpointId, taskId, idx, channel, JSON.stringify(value)],
        );
      }
    } finally {
      release();
    }
  }

  // ── list ──────────────────────────────────────────────────────────────

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const db = await this.db();
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs = (config.configurable?.checkpoint_ns as string) ?? "";
    const limit = options?.limit ?? 10;

    const rows = await db.select<
      Array<{
        checkpoint_id: string;
        parent_checkpoint_id: string | null;
        checkpoint: string;
        metadata: string;
      }>
    >(
      `SELECT checkpoint_id, parent_checkpoint_id, checkpoint, metadata
       FROM langgraph_checkpoints
       WHERE thread_id = $1 AND checkpoint_ns = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [threadId, checkpointNs, limit],
    );

    for (const row of rows) {
      const checkpoint: Checkpoint = JSON.parse(row.checkpoint);
      const metadata: CheckpointMetadata = JSON.parse(row.metadata);

      const parentConfig = row.parent_checkpoint_id
        ? {
            configurable: {
              thread_id: threadId,
              checkpoint_ns: checkpointNs,
              checkpoint_id: row.parent_checkpoint_id,
            },
          }
        : undefined;

      yield {
        config: {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: row.checkpoint_id,
          },
        },
        checkpoint,
        metadata,
        parentConfig,
      };
    }
  }

  // ── deleteThread ──────────────────────────────────────────────────────

  async deleteThread(threadId: string): Promise<void> {
    const release = await acquireWriteLock();
    try {
      const db = await this.db();
      await db.execute("DELETE FROM langgraph_checkpoints WHERE thread_id = $1", [threadId]);
      await db.execute("DELETE FROM langgraph_writes WHERE thread_id = $1", [threadId]);
    } finally {
      release();
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private async getLatestCheckpointId(
    threadId: string,
    checkpointNs: string,
  ): Promise<string | null> {
    const db = await this.db();
    const rows = await db.select<Array<{ checkpoint_id: string }>>(
      `SELECT checkpoint_id FROM langgraph_checkpoints
       WHERE thread_id = $1 AND checkpoint_ns = $2
       ORDER BY created_at DESC LIMIT 1`,
      [threadId, checkpointNs],
    );
    return rows.length > 0 ? rows[0].checkpoint_id : null;
  }
}
