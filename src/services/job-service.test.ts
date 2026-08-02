// src/services/job-service.test.ts
// ---------------------------------------------------------------------------
// Tests for job-service — merge results, auto-close, dedup_key matching.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mergeJobResults, autoCloseMissingJobs, backfillDedupKeys } from "./job-service";
import type { JobResult } from "../shared/types";

type MockDatabase = {
  execute: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

function makeMockDb(): MockDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue([]),
  };
}

function makeJob(overrides?: Partial<JobResult>): JobResult {
  return {
    id: overrides?.id ?? "in-abc123",
    title: overrides?.title ?? "Software Engineer",
    company: overrides?.company ?? "Acme Corp",
    location: overrides?.location ?? "Brussels",
    salary: overrides?.salary ?? "",
    applyUrl: overrides?.applyUrl ?? "https://example.com/job",
    description: overrides?.description ?? "A job description.",
    source: overrides?.source ?? "indeed",
  };
}

describe("mergeJobResults", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("matches by dedup_key when scraper id differs, preventing id collision", async () => {
    // A row exists with scraper ID "in-old456" and dedup_key for Acme/SE/Brussels
    // The new result has scraper ID "in-new789" but same content → same dedup_key
    // The upsert should use the existing row's id to avoid id PK conflict
    db.select.mockResolvedValueOnce([{ id: "in-old456", status: "--" }]);

    const job = makeJob({ id: "in-new789", title: "Software Engineer", company: "Acme Corp" });
    await mergeJobResults(db as unknown as Parameters<typeof mergeJobResults>[0], "search-1", [
      job,
    ]);

    // Should upsert using existing row's id "in-old456", not "in-new789"
    const executeCalls = db.execute.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    expect(executeCalls.length).toBeGreaterThan(0);
    const upsertSql = executeCalls[0][0] as string;
    expect(upsertSql).toContain("ON CONFLICT(id)");
    // params[0] should be the existing row's id, not the scraper's new id
    const params = executeCalls[0][1] as unknown[];
    expect(params[0]).toBe("in-old456");
  });

  it("handles same scraper id with changed content (different dedup_key)", async () => {
    // A row exists with scraper ID "in-abc123" but different company name
    // Same scraper ID comes back, but company changed → different dedup_key
    // dedup_key lookup fails (no match), so we fall through to id-based upsert
    db.select.mockResolvedValueOnce([]); // dedup_key lookup: no match

    const job = makeJob({ id: "in-abc123", company: "New Company Name" });
    await mergeJobResults(db as unknown as Parameters<typeof mergeJobResults>[0], "search-1", [
      job,
    ]);

    // Should INSERT with ON CONFLICT(id) — id matches existing PK, so UPDATE fires
    const executeCalls = db.execute.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    expect(executeCalls.length).toBeGreaterThan(0);
    const upsertSql = executeCalls[0][0] as string;
    expect(upsertSql).toContain("ON CONFLICT(id)");
  });
});

describe("autoCloseMissingJobs", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("does not close a job whose dedup_key is in the current set", async () => {
    // DB has a job whose raw ID changed but dedup_key still matches
    db.select.mockResolvedValueOnce([{ id: "in-old456", dedup_key: "abcd1234", status: "--" }]);

    const currentDedupKeys = new Set(["abcd1234"]);
    const count = await autoCloseMissingJobs(
      db as unknown as Parameters<typeof autoCloseMissingJobs>[0],
      "search-1",
      currentDedupKeys,
    );

    expect(count).toBe(0);
  });

  it("closes a job whose dedup_key is NOT in the current set", async () => {
    db.select.mockResolvedValueOnce([{ id: "in-missing", dedup_key: "deadbeef", status: "--" }]);

    const currentDedupKeys = new Set(["abcd1234", "cafe0000"]);
    const count = await autoCloseMissingJobs(
      db as unknown as Parameters<typeof autoCloseMissingJobs>[0],
      "search-1",
      currentDedupKeys,
    );

    expect(count).toBe(1);
    expect(db.execute).toHaveBeenCalled();
  });
});

describe("backfillDedupKeys", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = makeMockDb();
  });

  it("updates rows with NULL dedup_key", async () => {
    db.select.mockResolvedValueOnce([
      {
        id: "j1",
        company: "Acme Corp",
        title: "Software Engineer",
        location: "Brussels",
        source: "indeed",
      },
    ]);

    const count = await backfillDedupKeys(db as unknown as Parameters<typeof backfillDedupKeys>[0]);

    expect(count).toBe(1);
    expect(db.execute).toHaveBeenCalled();
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sql).toContain("SET dedup_key =");
    expect(params[0]).toBe("63f860f7"); // deterministic hash for these inputs
    expect(params[1]).toBe("j1");
  });

  it("returns 0 when no rows need backfill", async () => {
    db.select.mockResolvedValueOnce([]);

    const count = await backfillDedupKeys(db as unknown as Parameters<typeof backfillDedupKeys>[0]);

    expect(count).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });
});
