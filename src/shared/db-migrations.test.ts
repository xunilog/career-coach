// src/shared/db-migrations.test.ts
// ---------------------------------------------------------------------------
// Tests for db-migrations — verifies schema version, migration entries,
// table DDL, and Zod schema exports.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  SCHEMA_VERSION,
  MIGRATIONS,
  providerKeys,
  searches,
  jobs,
} from "./db-migrations";

describe("providerKeys table", () => {
  it("has a Zod schema that validates a full row", () => {
    const row = {
      provider: "anthropic",
      api_key: "sk-ant-key-123",
      verified_at: "2026-01-19T12:00:00Z",
    };

    const parsed = providerKeys.schema.parse(row);
    expect(parsed.provider).toBe("anthropic");
    expect(parsed.api_key).toBe("sk-ant-key-123");
    expect(parsed.verified_at).toBe("2026-01-19T12:00:00Z");
  });

  it("allows verified_at to be null", () => {
    const row = {
      provider: "mistral",
      api_key: "key-abc",
      verified_at: null,
    };

    const parsed = providerKeys.schema.parse(row);
    expect(parsed.verified_at).toBeNull();
  });

  it("produces DDL with provider as primary key", () => {
    const ddl = providerKeys.table;
    expect(ddl).toContain("CREATE TABLE");
    expect(ddl).toContain("provider_keys");
    expect(ddl).toContain("provider");
    expect(ddl).toContain("api_key");
    expect(ddl).toContain("verified_at");
    expect(ddl).toContain("PRIMARY KEY");
  });
});

describe("SCHEMA_VERSION", () => {
  it("is 7", () => {
    expect(SCHEMA_VERSION).toBe(7);
  });

  it("equals the highest migration version", () => {
    const maxMigration = Math.max(...MIGRATIONS.map((m) => m.version));
    expect(SCHEMA_VERSION).toBe(maxMigration);
  });
});

describe("MIGRATIONS", () => {
  it("includes migration for provider_keys table", () => {
    const migration = MIGRATIONS.find((m) => m.version === 7);
    expect(migration).toBeDefined();
    expect(migration!.label).toContain("provider_keys");
    expect(migration!.up).toContain("CREATE TABLE IF NOT EXISTS provider_keys");
    expect(migration!.up).toContain("api_key");
    expect(migration!.up).toContain("verified_at");
  });

  it("migration v7 is idempotent (IF NOT EXISTS)", () => {
    const migration = MIGRATIONS.find((m) => m.version === 7);
    expect(migration!.up).toContain("IF NOT EXISTS");
  });
});

describe("existing tables still export", () => {
  it("searches and jobs schemas are still accessible", () => {
    expect(searches.table).toContain("CREATE TABLE");
    expect(jobs.table).toContain("CREATE TABLE");
    expect(searches.schema).toBeDefined();
    expect(jobs.schema).toBeDefined();
  });
});
