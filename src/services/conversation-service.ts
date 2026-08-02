// src/services/conversation-service.ts
// ---------------------------------------------------------------------------
// Conversation service — CRUD on the conversations table.
// Previously handled by conversation-ipc.ts in the Electron main process.
// ---------------------------------------------------------------------------

import type Database from "@tauri-apps/plugin-sql";
import { v4 as uuid } from "uuid";
import { getDb } from "./database";
import { acquireWriteLock } from "./write-lock";
import { conversations as conversationsTable } from "../shared/db-migrations";
import type { z } from "zod/v4";

const conversationsSchema = conversationsTable.schema;
type ConversationRow = z.infer<typeof conversationsSchema>;

export interface Conversation {
  threadId: string;
  title: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    threadId: row.thread_id,
    title: row.title,
    type: row.type,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

export async function getLatestConversation(
  db: Database,
  type?: string,
): Promise<Conversation | null> {
  let rows: ConversationRow[];
  if (type) {
    const raw = await db.select<unknown[]>(
      `SELECT thread_id, title, type, created_at, updated_at FROM conversations
       WHERE type = $1 ORDER BY updated_at DESC LIMIT 1`,
      [type],
    );
    rows = raw as ConversationRow[];
  } else {
    const raw = await db.select<unknown[]>(
      `SELECT thread_id, title, type, created_at, updated_at FROM conversations
       ORDER BY updated_at DESC LIMIT 1`,
    );
    rows = raw as ConversationRow[];
  }
  if (rows.length === 0) return null;
  return rowToConversation(conversationsSchema.parse(rows[0]));
}

export async function listConversations(db: Database, type?: string): Promise<Conversation[]> {
  let rawRows: unknown[];
  if (type) {
    rawRows = await db.select<unknown[]>(
      `SELECT thread_id, title, type, created_at, updated_at FROM conversations
       WHERE type = $1 ORDER BY updated_at DESC`,
      [type],
    );
  } else {
    rawRows = await db.select<unknown[]>(
      `SELECT thread_id, title, type, created_at, updated_at FROM conversations
       ORDER BY updated_at DESC`,
    );
  }
  return rawRows.map((raw) => rowToConversation(conversationsSchema.parse(raw)));
}

export async function createConversation(
  db: Database,
  type = "general",
  title = "New Chat",
): Promise<Conversation> {
  const threadId = uuid();
  await db.execute("INSERT INTO conversations (thread_id, title, type) VALUES ($1, $2, $3)", [
    threadId,
    title,
    type,
  ]);
  const rows = await db.select<unknown[]>(
    "SELECT thread_id, title, type, created_at, updated_at FROM conversations WHERE thread_id = $1",
    [threadId],
  );
  return rowToConversation(conversationsSchema.parse(rows[0]));
}

export async function deleteConversation(db: Database, threadId: string): Promise<boolean> {
  const release = await acquireWriteLock();
  try {
    await db.execute("BEGIN TRANSACTION");
    await db.execute("DELETE FROM conversations WHERE thread_id = $1", [threadId]);
    await db.execute("DELETE FROM langgraph_checkpoints WHERE thread_id = $1", [threadId]);
    await db.execute("DELETE FROM langgraph_writes WHERE thread_id = $1", [threadId]);
    await db.execute("COMMIT");
  } catch (_e) {
    await db.execute("ROLLBACK");
    throw _e;
  } finally {
    release();
  }
  return true;
}

export async function updateConversationTitle(
  db: Database,
  threadId: string,
  title: string,
): Promise<void> {
  await db.execute(
    `UPDATE conversations SET title = $1, updated_at = datetime('now') WHERE thread_id = $2`,
    [title, threadId],
  );
}

export async function touchConversation(db: Database, threadId: string): Promise<void> {
  await db.execute(`UPDATE conversations SET updated_at = datetime('now') WHERE thread_id = $1`, [
    threadId,
  ]);
}

// Convenience wrappers that use the singleton DB
export async function getLatestConversationAuto(type?: string): Promise<Conversation | null> {
  return getLatestConversation(await getDb(), type);
}

export async function listConversationsAuto(type?: string): Promise<Conversation[]> {
  return listConversations(await getDb(), type);
}

export async function createConversationAuto(type?: string): Promise<Conversation> {
  return createConversation(await getDb(), type);
}

export async function deleteConversationAuto(threadId: string): Promise<boolean> {
  return deleteConversation(await getDb(), threadId);
}

export async function updateConversationTitleAuto(threadId: string, title: string): Promise<void> {
  return updateConversationTitle(await getDb(), threadId, title);
}

export async function touchConversationAuto(threadId: string): Promise<void> {
  return touchConversation(await getDb(), threadId);
}
