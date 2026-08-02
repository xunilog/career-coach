// shared/status-transitions.ts
// ---------------------------------------------------------------------------
// Status transition validation for the job application lifecycle.
// Defines allowed transitions between application statuses.
// ---------------------------------------------------------------------------

/** Lookup table: each status maps to the set of statuses it can transition *to*. */
export const STATUS_TRANSITIONS: Record<string, Set<string>> = {
  "--": new Set(["Saved", "Applied 📤", "Interview 🤝", "Offer 🎉", "Rejected ❌", "Archived"]),
  Saved: new Set(["--", "Applied 📤", "Interview 🤝", "Offer 🎉", "Rejected ❌", "Archived"]),
  "Applied 📤": new Set(["Interview 🤝", "Rejected ❌", "Archived"]),
  "Interview 🤝": new Set(["Offer 🎉", "Rejected ❌", "Archived"]),
  "Offer 🎉": new Set(["Archived"]),
  "Rejected ❌": new Set(["Archived"]),
  "Closed 🔒": new Set(["--", "Archived"]),
  Archived: new Set([
    "--",
    "Saved",
    "Applied 📤",
    "Interview 🤝",
    "Offer 🎉",
    "Rejected ❌",
    "Closed 🔒",
  ]),
};

/**
 * Returns true if the transition from `from` to `to` is valid.
 * Self-transitions (same status) are always invalid.
 */
export function isTransitionValid(from: string, to: string): boolean {
  if (from === to) return false;
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

/**
 * Returns all statuses that can be transitioned to from `from`.
 * Excludes `from` itself.
 */
export function getAllowedTransitions(from: string): string[] {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return [];
  return Array.from(allowed);
}

/**
 * Returns true if the status is terminal (no forward movement possible
 * except to Archived).
 */
export function isTerminal(status: string): boolean {
  return status === "Offer 🎉" || status === "Rejected ❌";
}

const ACTIVE_STATUSES = new Set(["--", "Saved", "Applied 📤", "Interview 🤝"]);

/** Returns true if the status represents an active, in-progress application. */
export function isActive(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}
