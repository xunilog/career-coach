// src/shared/db-migrations.ts
// ---------------------------------------------------------------------------
// Database schema definitions via zod-sqlite and migration history.
//
// This is the single source of truth for all table shapes. Every table is
// defined once with createTable(), which produces:
//   - `table`: SQL CREATE TABLE statement
//   - `indexes`: SQL CREATE INDEX statements
//   - `schema`: Zod object schema for runtime validation
//
// Migrations are append-only. Never edit an existing migration — add a new
// entry and bump SCHEMA_VERSION.
//
// Edge cases handled by patchDdl():
//   - BLOB columns (z.custom() maps to TEXT, so we patch it)
//   - DEFAULT (datetime('now')) — function defaults can't be expressed
//     in Zod; we inject them into the DDL
//   - CHECK (id = 1) — singleton table guard
// ---------------------------------------------------------------------------

import { createTable } from "zod-sqlite";
import { z } from "zod/v4";

// ── Table definitions ──────────────────────────────────────────────────────

const searches = createTable({
  name: "searches",
  columns: [
    { name: "id", schema: z.string() },
    { name: "title", schema: z.string() },
    { name: "location", schema: z.string() },
    { name: "country", schema: z.string().default("usa") },
    { name: "schedule", schema: z.string().default("manual") },
    { name: "created_at", schema: z.string().nullable() },
    { name: "last_run_at", schema: z.string().nullable() },
    { name: "filters", schema: z.string().default("{}") },
  ],
  primaryKeys: ["id"],
});

const jobs = createTable({
  name: "jobs",
  columns: [
    { name: "id", schema: z.string() },
    {
      name: "search_id",
      schema: z.string(),
      references: { table: "searches", column: "id", onDelete: "CASCADE" },
    },
    { name: "title", schema: z.string() },
    { name: "company", schema: z.string() },
    { name: "location", schema: z.string().nullable() },
    { name: "salary", schema: z.string().nullable() },
    { name: "fit", schema: z.string().nullable() },
    { name: "source", schema: z.string().default("hiring.cafe") },
    { name: "apply_url", schema: z.string().nullable() },
    { name: "found_at", schema: z.string().nullable() },
    { name: "status", schema: z.string().default("--") },
    { name: "description", schema: z.string().nullable() },
    { name: "notes", schema: z.string().nullable() },
    { name: "dedup_key", schema: z.string().nullable() },
    { name: "is_new", schema: z.number().default(1) },
  ],
  primaryKeys: ["id"],
  indexes: [
    { name: "idx_jobs_search_id", columns: ["search_id"] },
    { name: "idx_jobs_status", columns: ["status"] },
  ],
});

const research = createTable({
  name: "research",
  columns: [
    {
      name: "job_id",
      schema: z.string(),
      references: { table: "jobs", column: "id", onDelete: "CASCADE" },
    },
    { name: "overview", schema: z.string().nullable() },
    { name: "culture", schema: z.string().nullable() },
    { name: "news", schema: z.string().nullable() },
    { name: "key_people", schema: z.string().nullable() },
    { name: "recruiters", schema: z.string().nullable() },
    { name: "market", schema: z.string().nullable() },
    { name: "relevance", schema: z.string().nullable() },
    { name: "generated_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["job_id"],
});

const adaptedResumes = createTable({
  name: "adapted_resumes",
  columns: [
    {
      name: "job_id",
      schema: z.string(),
      references: { table: "jobs", column: "id", onDelete: "CASCADE" },
    },
    { name: "content", schema: z.string().nullable() },
    { name: "ats_score", schema: z.number().nullable() },
    { name: "human_score", schema: z.number().nullable() },
    { name: "iterations", schema: z.int().nullable() },
    { name: "generated_at", schema: z.string().nullable() },
    { name: "updated_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["job_id"],
});

const coverLetters = createTable({
  name: "cover_letters",
  columns: [
    {
      name: "job_id",
      schema: z.string(),
      references: { table: "jobs", column: "id", onDelete: "CASCADE" },
    },
    { name: "content", schema: z.string().nullable() },
    { name: "ats_score", schema: z.number().nullable() },
    { name: "human_score", schema: z.number().nullable() },
    { name: "iterations", schema: z.int().nullable() },
    { name: "generated_at", schema: z.string().nullable() },
    { name: "updated_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["job_id"],
});

const statusHistory = createTable({
  name: "status_history",
  columns: [
    { name: "id", schema: z.int() },
    {
      name: "job_id",
      schema: z.string(),
      references: { table: "jobs", column: "id", onDelete: "CASCADE" },
    },
    { name: "from_status", schema: z.string().nullable() },
    { name: "to_status", schema: z.string().nullable() },
    { name: "notes", schema: z.string().nullable() },
    { name: "changed_at", schema: z.string() },
  ],
  primaryKeys: ["id"],
  indexes: [{ name: "idx_status_history_job_id", columns: ["job_id"] }],
});

const langgraphCheckpoints = createTable({
  name: "langgraph_checkpoints",
  columns: [
    { name: "thread_id", schema: z.string() },
    { name: "checkpoint_ns", schema: z.string().default("") },
    { name: "checkpoint_id", schema: z.string() },
    { name: "parent_checkpoint_id", schema: z.string().nullable() },
    { name: "type", schema: z.string().nullable() },
    { name: "checkpoint", schema: z.string().nullable() },
    { name: "metadata", schema: z.string().nullable() },
    { name: "created_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["thread_id", "checkpoint_ns", "checkpoint_id"],
});

const langgraphWrites = createTable({
  name: "langgraph_writes",
  columns: [
    { name: "thread_id", schema: z.string() },
    { name: "checkpoint_ns", schema: z.string().default("") },
    { name: "checkpoint_id", schema: z.string() },
    { name: "task_id", schema: z.string() },
    { name: "idx", schema: z.int() },
    { name: "channel", schema: z.string() },
    { name: "value", schema: z.string().nullable() },
    { name: "created_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "idx"],
});

const conversations = createTable({
  name: "conversations",
  columns: [
    { name: "thread_id", schema: z.string() },
    { name: "title", schema: z.string().default("New Chat") },
    { name: "type", schema: z.string().default("general") },
    { name: "created_at", schema: z.string().nullable() },
    { name: "updated_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["thread_id"],
});

const providerKeys = createTable({
  name: "provider_keys",
  columns: [
    { name: "provider", schema: z.string() },
    { name: "api_key", schema: z.string() },
    { name: "verified_at", schema: z.string().nullable() },
  ],
  primaryKeys: ["provider"],
});

const careerProfile = createTable({
  name: "career_profile",
  columns: [
    { name: "id", schema: z.int() },
    { name: "dominant_color", schema: z.string().default("unknown") },
    { name: "secondary_color", schema: z.string().nullable() },
    { name: "disc_profile", schema: z.string().nullable() },
    { name: "career_drivers", schema: z.string().default("[]") },
    { name: "work_style_preferences", schema: z.string().default("[]") },
    { name: "core_values", schema: z.string().default("[]") },
    { name: "risk_appetite", schema: z.string().default("unknown") },
    { name: "risk_profile_details", schema: z.string().default("") },
    { name: "change_tolerance_notes", schema: z.string().default("") },
    { name: "raw_insights", schema: z.string().default("") },
    { name: "markdown", schema: z.string().default("") },
  ],
  primaryKeys: ["id"],
});

const workExperiences = createTable({
  name: "work_experiences",
  columns: [
    { name: "id", schema: z.string() },
    { name: "company", schema: z.string() },
    { name: "title", schema: z.string() },
    { name: "start_date", schema: z.string().default("") },
    { name: "end_date", schema: z.string().default("present") },
    { name: "sector", schema: z.string().default("") },
    { name: "team_size", schema: z.int().nullable() },
    { name: "budget_managed", schema: z.string().nullable() },
    { name: "direct_reports", schema: z.int().nullable() },
    { name: "raci_roles", schema: z.string().default("[]") },
    { name: "key_projects", schema: z.string().default("[]") },
    { name: "quantified_achievements", schema: z.string().default("[]") },
    { name: "skills_demonstrated", schema: z.string().default("[]") },
    { name: "challenges", schema: z.string().default("") },
    { name: "reason_for_leaving", schema: z.string().nullable() },
    { name: "raw_notes", schema: z.string().default("") },
  ],
  primaryKeys: ["id"],
});

const resumeDraft = createTable({
  name: "resume_draft",
  columns: [
    { name: "id", schema: z.int() },
    { name: "target_job", schema: z.string().default("") },
    { name: "draft", schema: z.string().default("") },
  ],
  primaryKeys: ["id"],
});

// ── DDL patching for zod-sqlite edge cases ─────────────────────────────────

/**
 * Patch generated DDL for SQLite features that zod-sqlite doesn't natively
 * express:
 *   - BLOB columns (replace TEXT → BLOB for named columns)
 *   - DEFAULT (datetime('now')) for timestamp columns
 *   - CHECK constraints (e.g. singleton tables)
 */
function patchDdl(
  tableDdl: string,
  patches: {
    blobs?: readonly string[];
    datetimeDefaults?: readonly string[];
    checks?: readonly string[];
  },
): string {
  let ddl = tableDdl;

  // Replace TEXT → BLOB for named columns
  for (const col of patches.blobs ?? []) {
    ddl = ddl.replace(new RegExp(`(${col})\\s+TEXT`, "g"), `$1 BLOB`);
  }

  // Add DEFAULT (datetime('now')) for timestamp columns that don't
  // already have a DEFAULT clause
  for (const col of patches.datetimeDefaults ?? []) {
    // Match: "col_name TYPE" or "col_name TYPE NOT NULL" — not already
    // followed by DEFAULT
    ddl = ddl.replace(
      new RegExp(`(${col}\\s+\\w+)(\\s+NOT NULL)?(?!.*DEFAULT)`, "g"),
      `$1$2 DEFAULT (datetime('now'))`,
    );
  }

  // Add CHECK constraints before the closing parenthesis
  for (const check of patches.checks ?? []) {
    ddl = ddl.replace(/\)\s*;?\s*$/, `  ${check}\n);`);
  }

  return ddl;
}

// ── Generate all DDL ───────────────────────────────────────────────────────

const ALL_DEFS = [
  { def: searches, patches: { datetimeDefaults: ["created_at"] } },
  { def: jobs, patches: { datetimeDefaults: ["found_at"] } },
  { def: research, patches: {} },
  { def: adaptedResumes, patches: {} },
  { def: coverLetters, patches: {} },
  { def: statusHistory, patches: { datetimeDefaults: ["changed_at"] } },
  {
    def: langgraphCheckpoints,
    patches: {
      blobs: ["checkpoint", "metadata"],
      datetimeDefaults: ["created_at"],
    },
  },
  {
    def: langgraphWrites,
    patches: { datetimeDefaults: ["created_at"] },
  },
  { def: conversations, patches: { datetimeDefaults: ["created_at", "updated_at"] } },
  { def: providerKeys, patches: {} },
  {
    def: careerProfile,
    patches: { checks: ["CHECK (id = 1)"] },
  },
  { def: workExperiences, patches: {} },
  {
    def: resumeDraft,
    patches: { checks: ["CHECK (id = 1)"] },
  },
] as const;

// ── Helper: join all DDL into a single migration string ────────────────────

function buildMigrationDdl(): string {
  const parts: string[] = [];
  for (const { def, patches } of ALL_DEFS) {
    // Add IF NOT EXISTS for idempotency — per project rules.
    const ddl = patchDdl(def.table, patches).replace(
      /^CREATE TABLE /,
      "CREATE TABLE IF NOT EXISTS ",
    );
    parts.push(ddl);
    for (const idx of def.indexes) {
      // CREATE INDEX ... → CREATE INDEX IF NOT EXISTS ...
      parts.push(idx.replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS "));
    }
  }
  return parts.join(";\n");
}

// ── Schema version ─────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 7;

export interface Migration {
  version: number; // version AFTER this migration is applied
  label: string; // human-readable description
  up: string; // DDL to run
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    label: "Initial schema — all 11 tables",
    up: buildMigrationDdl(),
  },
  {
    version: 2,
    label: "Add risk_profile_details column to career_profile",
    up: "ALTER TABLE career_profile ADD COLUMN risk_profile_details TEXT DEFAULT ''",
  },
  {
    version: 3,
    label: "Add type column to conversations",
    up: "ALTER TABLE conversations ADD COLUMN type TEXT DEFAULT 'general'",
  },
  {
    version: 4,
    label:
      "Migrate skills from string[] to Skill[] (name + category) in work_experiences and resume_draft",
    up: `
UPDATE work_experiences
SET skills_demonstrated = (
  SELECT json_group_array(
    json_object('name', je.value, 'category', 'technical')
  )
  FROM json_each(skills_demonstrated) je
)
WHERE json_valid(skills_demonstrated)
  AND skills_demonstrated != '[]'
  AND json_extract(skills_demonstrated, '$[0].name') IS NULL;

UPDATE resume_draft
SET draft = json_set(
  draft,
  '$.keySkills',
  (
    SELECT json_group_array(
      json_object('name', je.value, 'category', 'technical')
    )
    FROM json_each(json_extract(draft, '$.keySkills')) je
  )
)
WHERE json_valid(draft)
  AND json_extract(draft, '$.keySkills') IS NOT NULL
  AND json_array_length(json_extract(draft, '$.keySkills')) > 0
  AND json_extract(draft, '$.keySkills[0].name') IS NULL;
`,
  },
  {
    version: 5,
    label: "Add country column to searches",
    up: "ALTER TABLE searches ADD COLUMN country TEXT NOT NULL DEFAULT 'usa'",
  },
  {
    version: 6,
    label: "Add dedup_key column to jobs for stable content-based identity",
    up: `ALTER TABLE jobs ADD COLUMN dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_dedup_key ON jobs(dedup_key);`,
  },
  {
    version: 7,
    label: "Add provider_keys table for LLM API key storage",
    up: `CREATE TABLE IF NOT EXISTS provider_keys (
  provider TEXT PRIMARY KEY NOT NULL,
  api_key TEXT NOT NULL,
  verified_at TEXT
);`,
  },
];

// ── Exported Zod schemas for application use ───────────────────────────────

export { searches, jobs, research, adaptedResumes, coverLetters };
export { statusHistory, langgraphCheckpoints, langgraphWrites, conversations };
export { careerProfile, workExperiences, resumeDraft, providerKeys };
