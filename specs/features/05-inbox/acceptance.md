# Acceptance Notes — Inbox & Search Results

## Edge Cases

- **Zero searches**: Nav panel shows "No searches yet." Inbox shows empty state.
- **All results seen (is_new=0)**: Inbox is empty. Shows "No new results" with Search All button.
- **Archived jobs in results**: Hidden by default (WHERE status != 'Archived'). "Show Archived" toggle includes them dimmed.
- **Very long job titles/company names**: Table columns have max-width with text truncation.
- **Rapid Search All clicks**: Button is disabled while a search is in progress (guarded by isSearching state).

## Non-Functional

- **Table performance**: Virtual scrolling for large result sets (>100 jobs).
- **Query refresh**: TanStack Query refreshes on window focus and after mutations.
- **Sorting**: Client-side sort for the current page. Not server-side (SQLite is local so this is fine).

## Dependencies

- `better-sqlite3` for all queries (main process only, via IPC).
- Zustand `jobSearchStore` for active search ID and modal state.
- TanStack Query for caching and invalidation.
