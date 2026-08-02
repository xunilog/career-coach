# Acceptance Notes — Search Management & Execution

## Edge Cases

- **Empty search list**: Nav panel shows "No searches yet. Click + Add Search to get started."
- **Duplicate title + location**: Checked before create via `search:check-duplicate`. Shows inline error, not a crash.
- **Delete with zero jobs**: Delete succeeds with cascading deletes that affect no related rows.
- **Long search title**: UI truncates at 50 characters. DB stores full value.
- **Special characters in title/location**: SQLite TEXT handles all Unicode. No sanitization needed at DB layer.
- **Search with zero results**: "Search complete: 0 hits, 0 new" toast. Results table shows empty state.
- **Concurrent manual and scheduled runs**: Scheduler's in-progress guard ignores the tick if any search is running. User gets a UI warning if they try to trigger a manual search during an active run.
- **API failure mid-batch**: Partial results already inserted are preserved. Failed batch leaves those jobs unscored.

## Non-Functional

- **Search execution time**: Typically 10–60s depending on result count. Streaming IPC keeps the UI responsive.
- **Scheduler tick granularity**: 60s, so a search due at T+0 may run up to 60s later.
- **Rate limiting**: Exponential backoff with max 3 retries. If all retries fail, the search is skipped and retried on the next scheduled tick.
- **Database load**: Search execution is the heaviest DB writer. WAL mode prevents reader starvation during writes.

## Dependencies

- ts-jobspy must be functional (Indeed/LinkedIn scraping). No fallback data source exists.
- Mistral AI must be available for scoring (post-search). Scoring failure degrades to "Medium" default.
- `better-sqlite3` must be accessible (main process only).
