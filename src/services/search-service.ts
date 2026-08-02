// src/services/search-service.ts
// ---------------------------------------------------------------------------
// SearchService — async CRUD operations on the `searches` table via
// @tauri-apps/plugin-sql.
//
// Adapted from src/main/search-service.ts (was better-sqlite3 sync).
// ---------------------------------------------------------------------------

import type Database from "@tauri-apps/plugin-sql";
import { v4 as uuid } from "uuid";
import type { SearchDefinition, SearchInput, SearchUpdate, SearchFilters } from "../shared/types";
import { searches as searchesTable } from "../shared/db-migrations";
import { deleteJobsBySearchId } from "./job-service";
import type { z } from "zod/v4";

const searchesSchema = searchesTable.schema;
type SearchRow = z.infer<typeof searchesSchema>;

function rowToDefinition(row: SearchRow): SearchDefinition {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    country: row.country,
    schedule: row.schedule as SearchDefinition["schedule"],
    createdAt: row.created_at ?? "",
    lastRunAt: row.last_run_at ?? null,
    filters: JSON.parse(row.filters) as SearchFilters,
  };
}

export async function listSearches(db: Database): Promise<SearchDefinition[]> {
  const rawRows = await db.select<unknown[]>("SELECT * FROM searches ORDER BY created_at DESC");
  return rawRows.map((raw) => rowToDefinition(searchesSchema.parse(raw)));
}

export async function getSearch(db: Database, id: string): Promise<SearchDefinition | undefined> {
  const rows = await db.select<unknown[]>("SELECT * FROM searches WHERE id = $1", [id]);
  if (rows.length === 0) return undefined;
  return rowToDefinition(searchesSchema.parse(rows[0]));
}

export async function createSearch(db: Database, input: SearchInput): Promise<SearchDefinition> {
  const id = `srch-${uuid()}`;
  const now = new Date().toISOString();
  const schedule = input.schedule ?? "manual";
  const country = input.country ?? "usa";
  const filters = JSON.stringify(input.filters ?? {});

  await db.execute(
    `INSERT INTO searches (id, title, location, country, schedule, created_at, filters)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.title, input.location, country, schedule, now, filters],
  );

  return (await getSearch(db, id))!;
}

export async function updateSearch(
  db: Database,
  id: string,
  input: SearchUpdate,
): Promise<SearchDefinition | undefined> {
  const existing = await getSearch(db, id);
  if (!existing) return undefined;

  const title = input.title ?? existing.title;
  const location = input.location ?? existing.location;
  const country = input.country ?? existing.country;
  const schedule = input.schedule ?? existing.schedule;
  const filters = input.filters ? JSON.stringify(input.filters) : JSON.stringify(existing.filters);

  await db.execute(
    `UPDATE searches
     SET title = $1, location = $2, country = $3, schedule = $4, filters = $5
     WHERE id = $6`,
    [title, location, country, schedule, filters, id],
  );

  return getSearch(db, id);
}

export async function deleteSearch(db: Database, id: string): Promise<boolean> {
  await deleteJobsBySearchId(db, id);
  const result = await db.execute("DELETE FROM searches WHERE id = $1", [id]);
  return result.rowsAffected > 0;
}

export async function checkDuplicate(
  db: Database,
  title: string,
  location: string,
  country: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM searches
     WHERE title = $1 AND location = $2 AND country = $3 AND id != $4`,
    [title, location, country, excludeId ?? ""],
  );
  return rows[0].count > 0;
}
