// src/services/company-researcher.ts
// ---------------------------------------------------------------------------
// CompanyResearcher — performs web search and synthesizes structured company
// research using Mistral's native web search capability.
//
// Adapted from src/main/company-researcher.ts:
// - Uses import.meta.env instead of process.env
// - Uses getModel() factory instead of raw ChatMistralAI
// ---------------------------------------------------------------------------

import type Database from "@tauri-apps/plugin-sql";
import { research as researchTable } from "../shared/db-migrations";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod/v4";
import { getModel } from "../shared/llm-provider";
import type { StreamEvent } from "../shared/types";

export interface ResearchRow {
  overview: string | null;
  culture: string | null;
  news: string | null;
  keyPeople: string | null;
  recruiters: string | null;
  market: string | null;
  relevance: string | null;
}

export async function getResearchByJobId(db: Database, jobId: string): Promise<ResearchRow | null> {
  const rows = await db.select<unknown[]>(
    `SELECT overview, culture, news, key_people, recruiters, market, relevance
     FROM research WHERE job_id = $1`,
    [jobId],
  );
  if (rows.length === 0) return null;
  const r = researchTable.schema.parse(rows[0]);
  return {
    overview: r.overview,
    culture: r.culture,
    news: r.news,
    keyPeople: r.key_people,
    recruiters: r.recruiters,
    market: r.market,
    relevance: r.relevance,
  };
}

const ResearchState = Annotation.Root({
  company: Annotation<string>(),
  jobTitle: Annotation<string>(),
  overview: Annotation<string>(),
  culture: Annotation<string>(),
  news: Annotation<string>(),
  keyPeople: Annotation<string>(),
  market: Annotation<string>(),
  phase: Annotation<string>(),
  error: Annotation<string | null>(),
});

type ResearchStateType = typeof ResearchState.State;

function buildResearchPrompt(company: string, jobTitle: string): string {
  return `You are a professional company researcher. Research "${company}" thoroughly using web search. The target role is "${jobTitle}".

Use web search to gather current, factual information about the company. Produce a structured research report with the following sections. Each section should be 2-4 sentences of concrete, useful information a job seeker would want before an interview — plain text, no nested objects.

1. **overview**: What the company does, its size, industry, funding, and headquarters.
2. **culture**: Work environment, employee experience, and company culture based on reviews and careers pages.
3. **news**: Most important recent developments, product launches, funding rounds, or strategic shifts (2024-2025).
4. **keyPeople**: Key executives, leadership team members, and notable figures. Include names and titles.
5. **market**: Market position, major competitors, and industry standing.`;
}

const ResearchOutputSchema = z.object({
  overview: z.string(),
  culture: z.string(),
  news: z.string(),
  keyPeople: z.string(),
  market: z.string(),
});

async function researchNode(state: ResearchStateType): Promise<Partial<ResearchStateType>> {
  console.log(
    `[company-researcher] invoking LLM — company=${state.company} jobTitle=${state.jobTitle}`,
  );

  const model = await getModel(0.3);
  const structuredModel = model.withStructuredOutput(ResearchOutputSchema);
  const prompt = buildResearchPrompt(state.company, state.jobTitle);

  try {
    const result = await structuredModel.invoke(prompt);
    console.log(
      `[company-researcher] LLM response received — overviewLength=${result.overview.length}`,
    );

    return {
      overview: result.overview,
      culture: result.culture,
      news: result.news,
      keyPeople: result.keyPeople,
      market: result.market,
      phase: "done",
    };
  } catch (err) {
    return {
      error: `Research failed: ${(err as Error).message}`,
      phase: "error",
    };
  }
}

function buildResearchGraph(checkpointer?: BaseCheckpointSaver) {
  const builder = new StateGraph(ResearchState)
    .addNode("research", researchNode)
    .addEdge(START, "research")
    .addEdge("research", END);

  return builder.compile(checkpointer ? { checkpointer } : {});
}

let researchGraph = buildResearchGraph();

export function setResearchCheckpointer(checkpointer: BaseCheckpointSaver): void {
  researchGraph = buildResearchGraph(checkpointer);
}

export interface ResearchResult {
  overview: string | null;
  culture: string | null;
  news: string | null;
  keyPeople: string | null;
  recruiters: string | null;
  market: string | null;
  relevance: string | null;
}

export interface ResearchStreamCallbacks {
  onEvent: (event: StreamEvent) => void;
}

export async function researchCompany(
  company: string,
  jobTitle: string,
  callbacks: ResearchStreamCallbacks,
): Promise<ResearchResult> {
  callbacks.onEvent({
    type: "start",
    message: `Researching ${company}...`,
  });

  callbacks.onEvent({
    type: "phase",
    phase: "searching",
    message: "Searching the web for company information...",
  });

  const initialState = { company, jobTitle, error: null };

  try {
    const stream = await researchGraph.stream(initialState, {
      configurable: { thread_id: `research-${company}-${Date.now()}` },
      streamMode: "values",
    });

    let finalState: ResearchStateType | null = null;

    for await (const state of stream) {
      finalState = state as ResearchStateType;

      if (state.phase === "error") {
        throw new Error(state.error ?? "Unknown research error");
      }
    }

    if (finalState && finalState.phase === "done") {
      callbacks.onEvent({
        type: "phase",
        phase: "synthesizing",
        message: "Synthesizing research findings...",
      });

      const sections: Record<string, string | undefined> = {
        overview: finalState.overview,
        culture: finalState.culture,
        news: finalState.news,
        keyPeople: finalState.keyPeople,
        market: finalState.market,
      };

      for (const content of Object.values(sections)) {
        if (content) {
          callbacks.onEvent({
            type: "chunk",
            content,
            phase: "synthesizing",
          });
        }
      }

      callbacks.onEvent({
        type: "done",
        summary: `Research complete for ${company}`,
      });

      return {
        overview: finalState.overview ?? null,
        culture: finalState.culture ?? null,
        news: finalState.news ?? null,
        keyPeople: finalState.keyPeople ?? null,
        recruiters: null,
        market: finalState.market ?? null,
        relevance: null,
      };
    }

    throw new Error("Research graph did not produce results");
  } catch (err) {
    callbacks.onEvent({
      type: "error",
      message: `Research failed: ${(err as Error).message}`,
    });
    throw err;
  }
}
