// src/shared/api-key-manager.ts
// ---------------------------------------------------------------------------
// ApiKeyManager — resolves, verifies, and stores LLM provider API keys.
//
// Small interface (hasKey, resolveKey, verifyAndStoreKey, clearCache)
// hiding the complexity of env→DB precedence, HTTP verification against
// /v1/models, and provider_keys table operations.
// ---------------------------------------------------------------------------

import { getDb } from "../services/database";

// ── Types ───────────────────────────────────────────────────────────────────

export type LLMProvider = "gemini" | "deepseek" | "anthropic" | "mistral";

const DEFAULT_PROVIDER: LLMProvider = "anthropic";

const API_ENDPOINTS: Record<string, string> = {
  anthropic: "https://api.anthropic.com/v1/models",
};

const API_HEADERS: Record<string, (key: string) => Record<string, string>> = {
  anthropic: (key) => ({
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  }),
};

// ── Internal: env var lookup ────────────────────────────────────────────────

const ENV_KEY_MAP: Record<LLMProvider, string> = {
  gemini: "VITE_GEMINI_API_KEY",
  deepseek: "VITE_DEEPSEEK_API_KEY",
  anthropic: "VITE_ANTHROPIC_API_KEY",
  mistral: "VITE_MISTRAL_API_KEY",
};

function getEnvKey(provider: LLMProvider): string | undefined {
  const envVar = ENV_KEY_MAP[provider];
  return (import.meta.env as Record<string, string | undefined>)[envVar];
}

// ── Internal: DB lookup ────────────────────────────────────────────────────

interface ProviderKeyRow {
  api_key: string | null;
  verified_at: string | null;
}

async function getDbKey(provider: string): Promise<string | undefined> {
  const db = await getDb();
  const rows = await db.select<ProviderKeyRow[]>(
    "SELECT api_key, verified_at FROM provider_keys WHERE provider = $1",
    [provider],
  );
  if (rows.length === 0) return undefined;
  const row = rows[0];
  return row.api_key ?? undefined;
}

// ── resolveProvider ─────────────────────────────────────────────────────────

function resolveProvider(explicit?: LLMProvider): LLMProvider {
  return explicit ?? DEFAULT_PROVIDER;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether a usable API key is available for the given provider.
 * Returns true if an env var key OR a stored DB key exists.
 */
export async function hasKey(provider?: LLMProvider): Promise<boolean> {
  const resolved = resolveProvider(provider);

  // Env var has priority — if set, we're good
  if (getEnvKey(resolved)) return true;

  // Fall back to DB
  const dbKey = await getDbKey(resolved);
  return !!dbKey;
}

/**
 * Resolve the API key for the given provider.
 * Env var wins (dev override). DB is fallback. Throws if neither is available.
 */
export async function resolveKey(provider?: LLMProvider): Promise<string> {
  const resolved = resolveProvider(provider);

  // Env var first
  const envKey = getEnvKey(resolved);
  if (envKey) return envKey;

  // DB fallback
  const dbKey = await getDbKey(resolved);
  if (dbKey) return dbKey;

  throw new Error(`Missing API key for provider '${resolved}'`);
}

/**
 * Verify an API key by calling the provider's /v1/models endpoint,
 * then store it in the provider_keys table. Throws on invalid key
 * or network error.
 */
export async function verifyAndStoreKey(provider: string, key: string): Promise<void> {
  // Verify via HTTP
  const endpoint = API_ENDPOINTS[provider];
  const headersFn = API_HEADERS[provider];
  if (!endpoint || !headersFn) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { headers: headersFn(key) });
  } catch {
    throw new Error("Unable to reach Anthropic. Check your internet connection and try again.");
  }

  if (!response.ok) {
    // 401 or 403 → invalid key
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API key. Please check your key and try again.");
    }
    throw new Error(`Verification failed with status ${response.status}. Please try again.`);
  }

  // Store in DB
  const db = await getDb();
  await db.execute(
    `INSERT INTO provider_keys (provider, api_key, verified_at)
     VALUES ($1, $2, datetime('now'))
     ON CONFLICT(provider) DO UPDATE SET
       api_key = excluded.api_key,
       verified_at = excluded.verified_at`,
    [provider, key],
  );
}

/**
 * Clear any caches related to keys. Call after a key update so
 * subsequent getModel() calls pick up the new key.
 */
export function clearCache(): void {
  // The llm-provider module caches model instances by key.
  // Clearing the model cache is handled by the caller via
  // clearModelCache() from llm-provider.ts.
  // This function exists as a seam for future cache invalidation.
}
