# Acceptance Notes — Application Status Tracking

## Edge Cases

- **No status history**: First status change creates the first history entry with from_status = current status.
- **Rapid status changes**: Each change creates a separate history entry. No deduplication or throttling.
- **Notes field empty**: Stored as NULL in the database, rendered as empty in UI.
- **Status dropdown while generation is running**: Dropdown remains interactive. Status changes are independent of generation.
- **Un-archive from any status**: Archived jobs can transition to ANY status, including terminal ones (Offer, Rejected). This is intentional — un-archiving is a reset.

## Non-Functional

- **Transition validation**: Enforced in application code (`src/shared/status-transitions.ts`), not in the database. IPC handler validates before executing UPDATE.
- **Status history is append-only**: No UPDATE or DELETE on status_history rows. Immutable audit log.
- **Cascade on job delete**: status_history rows are deleted via CASCADE when the parent job is deleted.

## Dependencies

- `status-transitions.ts` for valid transition rules.
- IPC handlers: `job-search:update-status`, `job-search:update-notes`.
