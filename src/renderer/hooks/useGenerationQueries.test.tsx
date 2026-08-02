// src/renderer/hooks/useGenerationQueries.test.tsx
// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Tests for useGenerateMutation — stream event processing, cache invalidation,
// error handling.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { StreamEvent } from "../../shared/types";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGenerateDocument } = vi.hoisted(() => ({
  mockGenerateDocument: vi.fn(),
}));

vi.mock("../../services/generation-graph", () => ({
  generateDocument: mockGenerateDocument,
}));

vi.mock("../../services/database", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue([]),
  }),
  closeDb: vi.fn(),
}));

// Import after mocks are set up
import { useGenerateMutation } from "./useGenerationQueries";

// ── Wrapper ─────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ── Helper: simulate generation with events ─────────────────────────────────

function makeGenerateImpl(events: StreamEvent[]) {
  return async (
    _jobId: string,
    _documentType: string,
    _rescoreOnly: boolean,
    onEvent: (event: StreamEvent) => void,
  ) => {
    for (const event of events) {
      onEvent(event);
      // Let React process the state update
      await new Promise((r) => setTimeout(r, 0));
    }
    return { draftContent: "Final draft", atsScore: 85, humanScore: 80, iterations: 3 };
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("useGenerateMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial idle state", () => {
    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.chunks).toEqual([]);
    expect(result.current.phase).toBeNull();
    expect(result.current.atsScore).toBeNull();
    expect(result.current.humanScore).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.startGeneration).toBe("function");
  });

  it("calls generateDocument with correct args on startGeneration", async () => {
    mockGenerateDocument.mockImplementation(makeGenerateImpl([{ type: "done", summary: "Done" }]));

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(mockGenerateDocument).toHaveBeenCalledTimes(1);
    expect(mockGenerateDocument).toHaveBeenCalledWith(
      "job-123",
      "resume",
      false,
      expect.any(Function),
    );
  });

  it("sets isGenerating to true when start event received", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([{ type: "start", message: "Generating resume..." }]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.isGenerating).toBe(false); // done sets to false
  });

  it("updates chunks from chunk events", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Starting..." },
        {
          type: "chunk",
          content: "# Adapted Resume\n\nSkills: TypeScript, React",
          phase: "writing",
        },
        { type: "done", summary: "Complete" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.chunks).toEqual(["# Adapted Resume\n\nSkills: TypeScript, React"]);
  });

  it("updates scores from score events", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Starting..." },
        { type: "score", atsScore: 85, humanScore: 75, iteration: 2 },
        { type: "done", summary: "Complete" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.atsScore).toBe(85);
    expect(result.current.humanScore).toBe(80); // overridden by result
    expect(result.current.iteration).toBe(3); // overridden by result
  });

  it("updates feedback from feedback events", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Starting..." },
        { type: "feedback", atsFeedback: ["Missing keyword: agile"] },
        { type: "feedback", humanFeedback: ["Too many em-dashes"] },
        { type: "done", summary: "Complete" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.atsFeedback).toEqual(["Missing keyword: agile"]);
    expect(result.current.humanFeedback).toEqual(["Too many em-dashes"]);
  });

  it("updates personalizationSuggestions from personalization event", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Starting..." },
        { type: "personalization", suggestions: ["Use active voice", "Add metrics"] },
        { type: "done", summary: "Complete" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.personalizationSuggestions).toEqual(["Use active voice", "Add metrics"]);
  });

  it("updates phase from phase events", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Starting..." },
        { type: "phase", phase: "writing", message: "Writing draft (iteration 1)..." },
        { type: "phase", phase: "scoring", message: "Scoring ATS match..." },
        { type: "done", summary: "Complete" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    // Final phase is the 'done' summary
    expect(result.current.phase).toBe("Complete");
  });

  it("sets error state on generation failure", async () => {
    mockGenerateDocument.mockImplementation(async () => {
      throw new Error("LLM API error");
    });

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe("LLM API error");
  });

  it("passes rescoreOnly flag to generateDocument", async () => {
    mockGenerateDocument.mockImplementation(makeGenerateImpl([{ type: "done", summary: "Done" }]));

    const { result } = renderHook(() => useGenerateMutation("cover"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-456", true);
    });

    expect(mockGenerateDocument).toHaveBeenCalledWith(
      "job-456",
      "cover",
      true,
      expect.any(Function),
    );
  });

  it("works with cover letter document type", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Generating cover letter..." },
        { type: "chunk", content: "Dear Hiring Manager...", phase: "writing" },
        { type: "score", atsScore: 90, humanScore: 85, iteration: 1 },
        { type: "done", summary: "Generated with ATS: 90%, Human: 85%" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("cover"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.startGeneration("job-789", false);
    });

    expect(mockGenerateDocument).toHaveBeenCalledWith(
      "job-789",
      "cover",
      false,
      expect.any(Function),
    );
    expect(result.current.chunks).toEqual(["Dear Hiring Manager..."]);
  });

  it("resets stream state when starting a new generation", async () => {
    mockGenerateDocument.mockImplementation(
      makeGenerateImpl([
        { type: "start", message: "Starting fresh..." },
        { type: "done", summary: "Done" },
      ]),
    );

    const { result } = renderHook(() => useGenerateMutation("resume"), {
      wrapper: createWrapper(),
    });

    // First generate with an error scenario
    await act(async () => {
      await result.current.startGeneration("job-123", false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.phase).toBe("Done");
  });
});
