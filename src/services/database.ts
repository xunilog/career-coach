// src/services/database.ts
// ---------------------------------------------------------------------------
// Database singleton — wraps @tauri-apps/plugin-sql for the frontend.
// All SQLite access goes through a single cached connection.
// ---------------------------------------------------------------------------

import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:career-coach.db");
    await db.execute("PRAGMA journal_mode = WAL");
    await db.execute("PRAGMA foreign_keys = ON");
    await db.execute("PRAGMA busy_timeout = 5000");
  }
  return db;
}

/** Close the database connection (useful for testing). */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
