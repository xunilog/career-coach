# Monthly Schedule Support

**Status:** Accepted

The scheduler in `src/main/scheduler.ts` supports a `monthly` schedule option (720-hour check against `last_run_at`), but this was never documented in the original specs. The option already works end-to-end: the `searches` table schema accepts `'monthly'` as a valid schedule value, and the scheduler's due-check query includes the 720-hour delta.

This is now documented in the `scheduling.feature` specification (`REQ-SCHD-03`) and in the architecture diagrams.

## Consequences

- The SearchModal UI should expose "Monthly" as a schedule option if it doesn't already. This is a frontend concern — the backend already supports it.
- The due-check query uses `datetime(last_run_at, '+720 hours')` which approximates 30 days. This is close enough for a desktop app scheduler and avoids calendar-month edge cases.
