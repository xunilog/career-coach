# Scheduler as Main-Process Object, Not Zustand Store

**Status:** Accepted

The job search scheduler is a 60-second `setInterval` running in the Electron main process, using a shared `{ isRunning: boolean }` plain object as its in-progress guard. It is not a Zustand store.

This is intentional: the scheduler needs direct access to `better-sqlite3` (which is main-process-only — the renderer never accesses SQLite directly). The in-progress guard is a simple concurrency control, not UI state — the renderer never reads it for rendering decisions. UI search progress is communicated separately via streaming IPC events.

Earlier documentation incorrectly described the guard as a Zustand flag. That would require round-tripping through IPC just to check a boolean, adding latency and complexity for no benefit.

## Consequences

- The `isSearching` flag in `jobSearchStore.ts` (Zustand) reflects search progress in the UI — it is set by streaming events, not by reading the scheduler's guard.
- The scheduler guard prevents concurrent scheduled runs within the main process. The Zustand `isSearching` flag prevents the user from triggering manual searches during an active run.
