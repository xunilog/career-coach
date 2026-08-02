-- Career Coach — Initial schema (v1)
-- All 12 tables for the career coaching application.

CREATE TABLE IF NOT EXISTS searches (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    schedule TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now')),
    last_run_at TEXT,
    filters TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary TEXT,
    fit TEXT,
    source TEXT NOT NULL DEFAULT 'hiring.cafe',
    apply_url TEXT,
    found_at TEXT DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT '--',
    description TEXT,
    notes TEXT,
    is_new INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_jobs_search_id ON jobs(search_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS research (
    job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    overview TEXT,
    culture TEXT,
    news TEXT,
    key_people TEXT,
    recruiters TEXT,
    market TEXT,
    relevance TEXT,
    generated_at TEXT
);

CREATE TABLE IF NOT EXISTS adapted_resumes (
    job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT,
    ats_score REAL,
    human_score REAL,
    iterations INTEGER,
    generated_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS cover_letters (
    job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT,
    ats_score REAL,
    human_score REAL,
    iterations INTEGER,
    generated_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT,
    notes TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_status_history_job_id ON status_history(job_id);

CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS langgraph_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE TABLE IF NOT EXISTS conversations (
    thread_id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    type TEXT NOT NULL DEFAULT 'general',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS career_profile (
    id INTEGER PRIMARY KEY,
    dominant_color TEXT NOT NULL DEFAULT 'unknown',
    secondary_color TEXT,
    disc_profile TEXT,
    career_drivers TEXT NOT NULL DEFAULT '[]',
    work_style_preferences TEXT NOT NULL DEFAULT '[]',
    core_values TEXT NOT NULL DEFAULT '[]',
    risk_appetite TEXT NOT NULL DEFAULT 'unknown',
    risk_profile_details TEXT NOT NULL DEFAULT '',
    change_tolerance_notes TEXT NOT NULL DEFAULT '',
    raw_insights TEXT NOT NULL DEFAULT '',
    markdown TEXT NOT NULL DEFAULT '',
    CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS work_experiences (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date TEXT NOT NULL DEFAULT '',
    end_date TEXT NOT NULL DEFAULT 'present',
    sector TEXT NOT NULL DEFAULT '',
    team_size INTEGER,
    budget_managed TEXT,
    direct_reports INTEGER,
    raci_roles TEXT NOT NULL DEFAULT '[]',
    key_projects TEXT NOT NULL DEFAULT '[]',
    quantified_achievements TEXT NOT NULL DEFAULT '[]',
    skills_demonstrated TEXT NOT NULL DEFAULT '[]',
    challenges TEXT NOT NULL DEFAULT '',
    reason_for_leaving TEXT,
    raw_notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS resume_draft (
    id INTEGER PRIMARY KEY,
    target_job TEXT NOT NULL DEFAULT '',
    draft TEXT NOT NULL DEFAULT '',
    CHECK (id = 1)
);
