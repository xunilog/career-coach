# SQLite over Markdown Files for All Career Data

**Status:** Accepted

The original prototype stored profile, experiences, and resume as `.md` files on disk (`data/profile.md`, `data/experience.md`, `data/resume.md`). As the app grew, this caused race conditions (concurrent reads/writes), no indexing, no referential integrity, and no transactional updates across related data.

We migrated all career data to `better-sqlite3` tables (`career_profile`, `work_experiences`, `resume_draft`) with Zod schemas as the single source of truth. The three markdown files are now on-demand export artifacts — the `markdown` column in `career_profile` stores a rendered version, but all active reads go through SQLite.

A one-time `migrateFromFiles()` function in `career-data-service.ts` imports existing markdown files into SQLite at startup. Once migrated, the files are no longer the source of truth.

## Considered Options

- **Keep markdown files + add locking** — Would have been incremental but still lacked queries, indexing, and referential integrity. Would become a custom database over time anyway.
- **PostgreSQL or another external DB** — Overkill for a single-user desktop app. Would require installation, connection management, and process lifecycle. `better-sqlite3` is embedded, synchronous, and zero-config.
