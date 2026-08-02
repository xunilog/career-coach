// src/shared/llm-provider.test.ts
// ---------------------------------------------------------------------------
// Tests for llm-provider — verifies the model tier mapping (standard vs lite),
// caching, reasoning, and async key resolution via ApiKeyManager.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach } from "vitest";

// Mock the database so resolveKey can work in test (node) environment
vi.mock("../services/database", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock all LLM provider constructors so we can test without API keys
vi.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: vi.fn(function () {
    return { withStructuredOutput: vi.fn() };
  }),
}));

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: vi.fn(function () {
    return { withStructuredOutput: vi.fn() };
  }),
}));

vi.mock("@langchain/deepseek", () => ({
  ChatDeepSeek: vi.fn(function () {
    return { withStructuredOutput: vi.fn() };
  }),
}));

vi.mock("@langchain/mistralai", () => ({
  ChatMistralAI: vi.fn(function () {
    return { withStructuredOutput: vi.fn() };
  }),
}));

import { getModel, clearModelCache } from "./llm-provider";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatMistralAI } from "@langchain/mistralai";
import { clearCache as clearKeyCache } from "./api-key-manager";

// API keys exposed from env vars (dev mode) — use VITE_ prefix for consistency
process.env.VITE_GEMINI_API_KEY = "test-key";
process.env.VITE_DEEPSEEK_API_KEY = "test-key";
process.env.VITE_ANTHROPIC_API_KEY = "test-key";
process.env.VITE_MISTRAL_API_KEY = "test-key";

afterEach(() => {
  clearModelCache();
  clearKeyCache();
  vi.clearAllMocks();
});

describe("getModel", () => {
  describe("modelType parameter", () => {
    it('defaults to "standard" model when modelType is omitted', async () => {
      await getModel(0.3, "gemini");

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gemini-3.5-flash" }),
      );
    });

    it('uses the "lite" model when modelType is "lite"', async () => {
      await getModel(0.3, "gemini", "lite");

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gemini-3.1-flash-lite" }),
      );
    });

    it('uses deepseek lite model when modelType is "lite"', async () => {
      await getModel(0.3, "deepseek", "lite");

      expect(ChatDeepSeek).toHaveBeenCalledWith(
        expect.objectContaining({ model: "deepseek-v4-flash" }),
      );
    });

    it("uses standard model when modelType is standard explicitly", async () => {
      await getModel(0.3, "gemini", "standard");

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gemini-3.5-flash" }),
      );
    });

    it("caches models separately by modelType + provider", async () => {
      await getModel(0, "gemini"); // standard, cached
      await getModel(0, "gemini", "lite"); // lite, separate cache entry
      await getModel(0, "gemini", "expert"); // expert, separate cache entry
      await getModel(0, "gemini"); // standard, should hit cache

      // Only three distinct models created
      expect(ChatGoogleGenerativeAI).toHaveBeenCalledTimes(3);
    });

    it('uses the "expert" model when modelType is "expert"', async () => {
      await getModel(0.3, "anthropic", "expert");

      expect(ChatAnthropic).toHaveBeenCalledWith(
        expect.objectContaining({ model: "claude-opus-4-8" }),
      );
    });

    it("caches expert models separately from standard and lite", async () => {
      await getModel(0, "anthropic", "lite");
      await getModel(0, "anthropic", "standard");
      await getModel(0, "anthropic", "expert");

      expect(ChatAnthropic).toHaveBeenCalledTimes(3);
    });
  });

  describe("reasoning parameter", () => {
    it("accepts reasoning parameter without throwing", async () => {
      // Should not throw — the parameter is accepted and passed through
      await expect(
        getModel(0.3, "deepseek", "standard", true),
      ).resolves.toBeDefined();
    });

    it("defaults reasoning to false when omitted", async () => {
      // When reasoning is not passed, model works normally
      await expect(getModel(0.3, "deepseek")).resolves.toBeDefined();
    });

    it("caches reasoning and non-reasoning models separately when configured", async () => {
      await getModel(0, "deepseek", "standard", true);
      await getModel(0, "deepseek", "standard", false);

      // Two distinct models created (different reasoning config)
      expect(ChatDeepSeek).toHaveBeenCalledTimes(2);
    });
  });

  describe("key resolution", () => {
    it("throws when no env var or DB key is available", async () => {
      // Remove env vars to simulate production
      delete process.env.VITE_DEEPSEEK_API_KEY;
      delete process.env.VITE_ANTHROPIC_API_KEY;
      delete process.env.VITE_GEMINI_API_KEY;
      delete process.env.VITE_MISTRAL_API_KEY;

      // getModel tries to resolveKey which tries env then DB,
      // but DB is not available in test → throws
      await expect(getModel(0.3, "deepseek")).rejects.toThrow(
        "Missing API key for provider 'deepseek'",
      );
    });
  });
});
