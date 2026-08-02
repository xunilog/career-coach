// src/shared/api-key-manager.test.ts
// ---------------------------------------------------------------------------
// Tests for ApiKeyManager — env→DB precedence, key verification via
// /v1/models, storage via provider_keys table.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { hasKey, resolveKey, verifyAndStoreKey, clearCache } from "./api-key-manager";

// We need to mock the database. The module uses getDb() from "../services/database".
// For tests in src/shared/ we import directly from the module.
// Since api-key-manager.ts imports getDb, we mock that path.
vi.mock("../services/database", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../services/database";

// Mock fetch for Anthropic API verification
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock import.meta.env
const originalEnv = { ...import.meta.env };

function setEnv(key: string, value: string | undefined) {
  (import.meta.env as Record<string, string | undefined>)[key] = value;
}

function clearEnv() {
  const env = import.meta.env as Record<string, string | undefined>;
  delete env["VITE_ANTHROPIC_API_KEY"];
  delete env["VITE_MISTRAL_API_KEY"];
  delete env["VITE_LLM_PROVIDER"];
}

function makeMockDb(selectResults: unknown[] = []) {
  return {
    select: vi.fn().mockResolvedValue(selectResults),
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearCache();
  clearEnv();
});

afterEach(() => {
  // Restore env
  Object.assign(import.meta.env, originalEnv);
});

// ── hasKey ─────────────────────────────────────────────────────────────────

describe("hasKey", () => {
  it("returns true when a verified key exists in the database", async () => {
    const mockDb = makeMockDb([
      { provider: "anthropic", api_key: "sk-ant-key", verified_at: "2026-01-19T12:00:00Z" },
    ]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await hasKey("anthropic");
    expect(result).toBe(true);
    expect(mockDb.select).toHaveBeenCalledWith(
      "SELECT api_key, verified_at FROM provider_keys WHERE provider = $1",
      ["anthropic"],
    );
  });

  it("returns false when no row exists in the database", async () => {
    const mockDb = makeMockDb([]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await hasKey("anthropic");
    expect(result).toBe(false);
  });

  it("returns true when env var provides the key (dev override)", async () => {
    setEnv("VITE_ANTHROPIC_API_KEY", "env-key-123");
    // DB has no key
    const mockDb = makeMockDb([]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await hasKey("anthropic");
    expect(result).toBe(true);
    // Should not even query DB when env var is present
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("returns false when neither env nor DB has a key", async () => {
    const mockDb = makeMockDb([]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await hasKey("anthropic");
    expect(result).toBe(false);
  });

  it("defaults to anthropic when provider is omitted", async () => {
    const mockDb = makeMockDb([
      { provider: "anthropic", api_key: "sk-ant-key", verified_at: "2026-01-19T12:00:00Z" },
    ]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await hasKey();
    expect(result).toBe(true);
    expect(mockDb.select).toHaveBeenCalledWith(
      "SELECT api_key, verified_at FROM provider_keys WHERE provider = $1",
      ["anthropic"],
    );
  });
});

// ── resolveKey ─────────────────────────────────────────────────────────────

describe("resolveKey", () => {
  it("returns the env var key when set", async () => {
    setEnv("VITE_ANTHROPIC_API_KEY", "env-key-456");
    const mockDb = makeMockDb([]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const key = await resolveKey("anthropic");
    expect(key).toBe("env-key-456");
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("returns the DB key when env var is not set", async () => {
    const mockDb = makeMockDb([
      { provider: "anthropic", api_key: "db-key-789", verified_at: "2026-01-19T12:00:00Z" },
    ]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const key = await resolveKey("anthropic");
    expect(key).toBe("db-key-789");
  });

  it("throws when neither env nor DB has a key", async () => {
    const mockDb = makeMockDb([]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await expect(resolveKey("anthropic")).rejects.toThrow(
      "Missing API key for provider 'anthropic'",
    );
  });

  it("throws when DB has a row but api_key is null", async () => {
    const mockDb = makeMockDb([
      { provider: "anthropic", api_key: null, verified_at: null },
    ]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await expect(resolveKey("anthropic")).rejects.toThrow(
      "Missing API key for provider 'anthropic'",
    );
  });

  it("defaults to anthropic when provider is omitted", async () => {
    const mockDb = makeMockDb([
      { provider: "anthropic", api_key: "sk-ant-key", verified_at: "2026-01-19T12:00:00Z" },
    ]);
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const key = await resolveKey();
    expect(key).toBe("sk-ant-key");
  });
});

// ── verifyAndStoreKey ──────────────────────────────────────────────────────

describe("verifyAndStoreKey", () => {
  const VALID_KEY = "sk-ant-valid-key-123";

  it("verifies and stores a valid key", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const mockDb = makeMockDb();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await verifyAndStoreKey("anthropic", VALID_KEY);

    // Called the Anthropic models endpoint
    expect(mockFetch).toHaveBeenCalledWith("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": VALID_KEY,
        "anthropic-version": "2023-06-01",
      },
    });

    // Stored in the database
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO provider_keys"),
      expect.arrayContaining(["anthropic", VALID_KEY]),
    );
  });

  it("throws on 401 (invalid key)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const mockDb = makeMockDb();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await expect(verifyAndStoreKey("anthropic", "bad-key")).rejects.toThrow(
      "Invalid API key. Please check your key and try again.",
    );

    // Key is NOT stored
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it("throws on 403 (forbidden)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const mockDb = makeMockDb();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await expect(verifyAndStoreKey("anthropic", "bad-key")).rejects.toThrow(
      "Invalid API key. Please check your key and try again.",
    );

    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const mockDb = makeMockDb();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await expect(verifyAndStoreKey("anthropic", VALID_KEY)).rejects.toThrow(
      "Unable to reach Anthropic. Check your internet connection and try again.",
    );

    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it("upserts on update (ON CONFLICT)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const mockDb = makeMockDb();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    await verifyAndStoreKey("anthropic", "new-key");

    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(provider)"),
      expect.arrayContaining(["anthropic", "new-key"]),
    );
  });
});
