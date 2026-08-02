// shared/db-schema.ts
// ---------------------------------------------------------------------------
// SQL DDL for the Job Search Module — all 11 tables with foreign keys,
// cascading deletes, and WAL journal mode.
// ---------------------------------------------------------------------------

/** Enable WAL mode for concurrent reads and better write performance. */
export const PRAGMA_WAL = "PRAGMA journal_mode=WAL;";

// ── Searches ───────────────────────────────────────────────────────────────

export const CREATE_SEARCHES = `
CREATE TABLE IF NOT EXISTS searches (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  location    TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'usa',
  schedule    TEXT NOT NULL DEFAULT 'manual',
  created_at  TEXT,
  last_run_at TEXT,
  filters     TEXT NOT NULL DEFAULT '{}'
);
`;

// ── Jobs ────────────────────────────────────────────────────────────────────

export const CREATE_JOBS = `
CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  search_id   TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  company     TEXT NOT NULL,
  location    TEXT,
  salary      TEXT,
  fit         TEXT,
  source      TEXT DEFAULT 'hiring.cafe',
  apply_url   TEXT,
  found_at    TEXT NOT NULL DEFAULT (datetime('now')),
  status      TEXT NOT NULL DEFAULT '--',
  description TEXT,
  notes       TEXT,
  is_new      INTEGER NOT NULL DEFAULT 1
);
`;

// ── Research ────────────────────────────────────────────────────────────────

export const CREATE_RESEARCH = `
CREATE TABLE IF NOT EXISTS research (
  job_id       TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  overview     TEXT,
  culture      TEXT,
  news         TEXT,
  key_people   TEXT,
  recruiters   TEXT,
  market       TEXT,
  relevance    TEXT,
  generated_at TEXT
);
`;

// ── Adapted Resumes ─────────────────────────────────────────────────────────

export const CREATE_ADAPTED_RESUMES = `
CREATE TABLE IF NOT EXISTS adapted_resumes (
  job_id      TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  content     TEXT,
  ats_score   REAL,
  human_score REAL,
  iterations  INTEGER,
  generated_at TEXT,
  updated_at  TEXT
);
`;

// ── Cover Letters ───────────────────────────────────────────────────────────

export const CREATE_COVER_LETTERS = `
CREATE TABLE IF NOT EXISTS cover_letters (
  job_id      TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  content     TEXT,
  ats_score   REAL,
  human_score REAL,
  iterations  INTEGER,
  generated_at TEXT,
  updated_at  TEXT
);
`;

// ── Status History ──────────────────────────────────────────────────────────

export const CREATE_STATUS_HISTORY = `
CREATE TABLE IF NOT EXISTS status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT,
  notes       TEXT,
  changed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ── LangGraph Checkpoints ───────────────────────────────────────────────────

export const CREATE_LANGGRAPH_CHECKPOINTS = `
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
  thread_id            TEXT NOT NULL,
  checkpoint_ns        TEXT NOT NULL DEFAULT '',
  checkpoint_id        TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type                 TEXT,
  checkpoint           BLOB,
  metadata             BLOB,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);
`;

// ── Conversations ───────────────────────────────────────────────────────────

export const CREATE_CONVERSATIONS = `
CREATE TABLE IF NOT EXISTS conversations (
  thread_id  TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT 'New Chat',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ── LangGraph Writes ────────────────────────────────────────────────────────

export const CREATE_LANGGRAPH_WRITES = `
CREATE TABLE IF NOT EXISTS langgraph_writes (
  thread_id       TEXT NOT NULL,
  checkpoint_ns   TEXT NOT NULL DEFAULT '',
  checkpoint_id   TEXT NOT NULL,
  task_id         TEXT NOT NULL,
  idx             INTEGER NOT NULL,
  channel         TEXT NOT NULL,
  value           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
`;

// ── Career Profile ──────────────────────────────────────────────────────────

export const CREATE_CAREER_PROFILE = `
CREATE TABLE IF NOT EXISTS career_profile (
  id                      INTEGER PRIMARY KEY CHECK (id = 1),
  dominant_color          TEXT NOT NULL DEFAULT 'unknown',
  secondary_color         TEXT,
  disc_profile            TEXT,
  career_drivers          TEXT NOT NULL DEFAULT '[]',
  work_style_preferences  TEXT NOT NULL DEFAULT '[]',
  core_values             TEXT NOT NULL DEFAULT '[]',
  risk_appetite           TEXT NOT NULL DEFAULT 'unknown',
  change_tolerance_notes  TEXT NOT NULL DEFAULT '',
  raw_insights            TEXT NOT NULL DEFAULT '',
  markdown                TEXT NOT NULL DEFAULT ''
);
`;

// ── Work Experiences ────────────────────────────────────────────────────────

export const CREATE_WORK_EXPERIENCES = `
CREATE TABLE IF NOT EXISTS work_experiences (
  id                       TEXT PRIMARY KEY,
  company                  TEXT NOT NULL,
  title                    TEXT NOT NULL,
  start_date               TEXT NOT NULL DEFAULT '',
  end_date                 TEXT NOT NULL DEFAULT 'present',
  sector                   TEXT NOT NULL DEFAULT '',
  team_size                INTEGER,
  budget_managed           TEXT,
  direct_reports           INTEGER,
  raci_roles               TEXT NOT NULL DEFAULT '[]',
  key_projects             TEXT NOT NULL DEFAULT '[]',
  quantified_achievements  TEXT NOT NULL DEFAULT '[]',
  skills_demonstrated      TEXT NOT NULL DEFAULT '[]',
  challenges               TEXT NOT NULL DEFAULT '',
  reason_for_leaving       TEXT,
  raw_notes                TEXT NOT NULL DEFAULT ''
);
`;

// ── Resume Draft ────────────────────────────────────────────────────────────

export const CREATE_RESUME_DRAFT = `
CREATE TABLE IF NOT EXISTS resume_draft (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  target_job TEXT NOT NULL DEFAULT '',
  draft      TEXT NOT NULL DEFAULT ''
);
`;

// ── All DDL statements in order ─────────────────────────────────────────────

export const ALL_DDL = [
  PRAGMA_WAL,
  CREATE_SEARCHES,
  CREATE_JOBS,
  CREATE_RESEARCH,
  CREATE_ADAPTED_RESUMES,
  CREATE_COVER_LETTERS,
  CREATE_STATUS_HISTORY,
  CREATE_LANGGRAPH_CHECKPOINTS,
  CREATE_LANGGRAPH_WRITES,
  CREATE_CONVERSATIONS,
  CREATE_CAREER_PROFILE,
  CREATE_WORK_EXPERIENCES,
  CREATE_RESUME_DRAFT,
];
