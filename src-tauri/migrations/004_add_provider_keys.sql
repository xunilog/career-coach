-- Career Coach — Migration v4: Add provider_keys table for LLM API key storage
-- Stores API keys per provider (anthropic, mistral, gemini, deepseek)
-- with verification timestamp. Replaces compile-time VITE_* env vars.

CREATE TABLE IF NOT EXISTS provider_keys (
  provider TEXT PRIMARY KEY NOT NULL,
  api_key TEXT NOT NULL,
  verified_at TEXT
);
