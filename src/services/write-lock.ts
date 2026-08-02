// src/services/write-lock.ts
// ---------------------------------------------------------------------------
// Serialized write lock for the shared SQLite connection. Multi-statement
// operations (DELETE+INSERT, transactions) must not interleave on the same
// connection. This promise-chain ensures sequential execution.
// ---------------------------------------------------------------------------

let writeLock: Promise<void> = Promise.resolve();

/** Acquire the write lock. Returns a release function — call it in a finally block. */
export function acquireWriteLock(): Promise<() => void> {
  const prev = writeLock;
  let release: () => void;
  writeLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  return prev.then(() => release!);
}
