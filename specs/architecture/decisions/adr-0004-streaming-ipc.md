# Streaming IPC as Default for AI Operations

**Status:** Accepted

Any AI operation expected to take >1 second uses a streaming IPC pattern instead of request/response. The renderer subscribes to a UUID-named channel via `ipcRenderer.on`, then invokes the operation. The main process sends progressive events (`start`, `phase`, `chunk`, `score`, `feedback`, `personalization`, `done`, `error`) via `event.sender.send`. The renderer accumulates state and updates the UI in real-time.

This pattern is used consistently across company research, document generation (both generation and re-score), and search execution. The alternative — a spinner with a single response — would leave the user staring at nothing for 30+ seconds during generation.

## Consequences

- Every streaming operation needs explicit listener cleanup (`ipcRenderer.removeListener`) to avoid memory leaks.
- Streaming channels are per-request (UUID-scoped), so concurrent operations don't interfere.
- The Zustand `careerStore` and TanStack Query hooks both handle streaming state, depending on the feature context.
