// shared/llm-provider.ts
// ---------------------------------------------------------------------------
// LLMProvider — single factory for all LLM access.
// Supports Gemini, DeepSeek, Anthropic (Claude), and Mistral backends.
// Key resolution: env var (VITE_*) wins (dev override), then DB (provider_keys).
// Driven by VITE_LLM_PROVIDER env var (default: "anthropic") or explicit parameter.
// ---------------------------------------------------------------------------

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatDeepSeek } from "@langchain/deepseek";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { resolveKey, type LLMProvider } from "./api-key-manager";

// ── Provider type (re-exported from api-key-manager) ──────────────────────

export type { LLMProvider } from "./api-key-manager";

// ── Model tier type ─────────────────────────────────────────────────────────

/**
 * Model tier — controls which model is selected within a provider.
 * - "lite": cheapest, fastest model for classification / scoring.
 * - "standard": balanced quality/cost for general use (default).
 * - "expert": most capable model for complex reasoning / coaching.
 */
export type ModelType = "lite" | "standard" | "expert";

// ── Provider config ────────────────────────────────────────────────────────

interface ProviderConfig {
  models: Record<ModelType, string>;
  apiKeyEnv: string;
}

const PROVIDER_CONFIG: Record<LLMProvider, ProviderConfig> = {
  gemini: {
    models: {
      lite: "gemini-3.1-flash-lite",
      standard: "gemini-3.5-flash",
      expert: "gemini-3.5-pro",
    },
    apiKeyEnv: "VITE_GEMINI_API_KEY",
  },
  deepseek: {
    models: { lite: "deepseek-v4-flash", standard: "deepseek-v4-pro", expert: "deepseek-v4-pro" },
    apiKeyEnv: "VITE_DEEPSEEK_API_KEY",
  },
  anthropic: {
    models: { lite: "claude-haiku-4-5", standard: "claude-sonnet-4-6", expert: "claude-opus-4-8" },
    apiKeyEnv: "VITE_ANTHROPIC_API_KEY",
  },
  mistral: {
    models: {
      lite: "mistral-mini-latest",
      standard: "mistral-medium-latest",
      expert: "mistral-large-latest",
    },
    apiKeyEnv: "VITE_MISTRAL_API_KEY",
  },
};

// ── Cache ───────────────────────────────────────────────────────────────────

const modelCache = new Map<string, BaseChatModel>();

function cacheKey(
  provider: LLMProvider,
  model: string,
  temperature: number,
  reasoning?: boolean,
): string {
  const suffix = reasoning ? ":reasoning" : "";
  return `${provider}:${model}@${temperature}${suffix}`;
}

// ── Factory ─────────────────────────────────────────────────────────────────

function resolveProvider(explicit?: LLMProvider): LLMProvider {
  const raw = explicit ?? import.meta.env.VITE_LLM_PROVIDER;
  if (raw === "gemini" || raw === "deepseek" || raw === "anthropic" || raw === "mistral")
    return raw;
  if (raw !== undefined) {
    console.warn(`[llm-provider] unknown VITE_LLM_PROVIDER "${raw}" — falling back to anthropic`);
  }
  return "anthropic";
}

/**
 * Get a configured Chat model instance for the given provider, tier, and
 * temperature. Cached by provider + model + temperature + reasoning so
 * different callers can get appropriately-configured models without
 * conflicting.
 *
 * Key resolution: env var (VITE_*) first (dev override), then
 * provider_keys table in the database (production).
 */
export async function getModel<M extends ModelType = "standard">(
  temperature = 0.3,
  provider?: LLMProvider,
  modelType?: M,
  reasoning?: boolean,
): Promise<BaseChatModel> {
  const resolved = resolveProvider(provider);
  const config = PROVIDER_CONFIG[resolved];
  const model = config.models[modelType ?? "standard"];

  const apiKey = await resolveKey(resolved);

  const key = cacheKey(resolved, model, temperature, reasoning);
  const cached = modelCache.get(key);
  if (cached) {
    console.log(`[llm-provider] cache hit → ${key}`);
    return cached;
  }

  const reasoningLabel = reasoning ? " (reasoning)" : "";
  console.log(`[llm-provider] creating model → ${key}${reasoningLabel}`);

  let instance: BaseChatModel;
  switch (resolved) {
    case "gemini":
      instance = new ChatGoogleGenerativeAI({
        model,
        temperature,
        apiKey,
        thinkingConfig: { thinkingLevel: "MINIMAL" as "LOW" },
      }) as unknown as BaseChatModel;
      break;
    case "deepseek":
      instance = new ChatDeepSeek({
        model,
        temperature,
        apiKey,
      }) as unknown as BaseChatModel;
      break;
    case "anthropic":
      instance = new ChatAnthropic({
        model,
        apiKey,
        ...(reasoning
          ? { thinking: { type: "enabled" as const, budget_tokens: 4096 } }
          : { temperature }),
      }) as unknown as BaseChatModel;
      break;
    case "mistral":
      instance = new ChatMistralAI({
        model,
        temperature,
        apiKey,
      }) as unknown as BaseChatModel;
      break;
  }

  modelCache.set(key, instance);
  return instance;
}

/** Clear the cached models (useful for tests). */
export function clearModelCache(): void {
  modelCache.clear();
}
