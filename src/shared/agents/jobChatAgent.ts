// src/shared/agents/jobChatAgent.ts
// ---------------------------------------------------------------------------
// JobChatAgent — agent for the Job Detail page with DB-backed tools for
// reading profile, experiences, resume draft, and the current document.
// ---------------------------------------------------------------------------

import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { getModel } from "../llm-provider";
import { getDb } from "../../services/database";
import { getProfile, getExperiences, getResumeDraft } from "../../services/career-data-service";
import type { DocumentType } from "../types";

export interface CreateJobChatAgentParams {
  jobId: string;
  documentType: DocumentType;
  onDocumentUpdated?: () => void;
}

export async function createJobChatAgent(
  params: CreateJobChatAgentParams,
  checkpointer?: BaseCheckpointSaver,
) {
  const { jobId, documentType, onDocumentUpdated } = params;
  const llm = await getModel(0.7, undefined, undefined, true);

  // ── read_profile ──────────────────────────────────────────────────────

  const readProfileTool = tool(
    async () => {
      try {
        const db = await getDb();
        const profile = await getProfile(db);
        if (!profile)
          return "No profile data found. The user should complete the Profile Coach first.";
        return `Profile Markdown:\n${profile.markdown || "(empty)"}\n\nStructured Data:\n${JSON.stringify(profile, null, 2)}`;
      } catch (err) {
        return `Error reading profile: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    },
    {
      name: "read_profile",
      description:
        "Read the user's full career personality profile (Colors, DISC, career drivers, values, risk appetite, work style preferences). Call this when you need background on the user's personality, work style, or career motivations.",
      schema: z.object({}),
    },
  );

  // ── read_experiences ──────────────────────────────────────────────────

  const readExperiencesTool = tool(
    async () => {
      try {
        const db = await getDb();
        const exps = await getExperiences(db);
        if (exps.length === 0)
          return "No work experiences recorded yet. The user should complete the Experience Coach first.";
        return exps
          .map(
            (exp) =>
              `## ${exp.title} at ${exp.company} (${exp.startDate} – ${exp.endDate})\n` +
              `Sector: ${exp.sector || "N/A"}\n` +
              `Achievements: ${(exp.quantifiedAchievements ?? []).join("; ") || "none"}\n` +
              `Skills: ${(exp.skillsDemonstrated ?? []).map((s) => s.name).join(", ") || "none"}\n` +
              `Raw Notes: ${exp.rawNotes || "none"}`,
          )
          .join("\n\n");
      } catch (err) {
        return `Error reading experiences: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    },
    {
      name: "read_experiences",
      description:
        "Read all work experiences (company, title, dates, achievements, skills, projects). Call this when you need the user's employment history, quantified achievements, or demonstrated skills.",
      schema: z.object({}),
    },
  );

  // ── read_resume_draft ─────────────────────────────────────────────────

  const readResumeDraftTool = tool(
    async () => {
      try {
        const db = await getDb();
        const draft = await getResumeDraft(db);
        if (!draft)
          return "No reference resume draft found. The user should complete the Resume Coach first.";
        return JSON.stringify(draft, null, 2);
      } catch (err) {
        return `Error reading resume draft: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    },
    {
      name: "read_resume_draft",
      description:
        "Read the user's reference resume draft (the kitchen-sink version, not job-tailored). Contains personal info (name, email, phone, LinkedIn, location), professional highlights, all skills, education, and languages. Call this when you need the user's contact details, education, or skills inventory.",
      schema: z.object({}),
    },
  );

  // ── read_document ─────────────────────────────────────────────────────

  const readDocumentTool = tool(
    async () => {
      try {
        const db = await getDb();
        const table = documentType === "resume" ? "adapted_resumes" : "cover_letters";
        const rows = await db.select<Array<{ content: string | null }>>(
          `SELECT content FROM ${table} WHERE job_id = $1`,
          [jobId],
        );
        return (
          rows[0]?.content ??
          "No document content yet. Generate a document first or ask me to create one."
        );
      } catch (err) {
        return `Error reading document: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    },
    {
      name: "read_document",
      description: `Read the current ${documentType} document content shown in the editor. Call this FIRST at the start of every turn to see the current state. Returns the full markdown document.`,
      schema: z.object({}),
    },
  );

  // ── update_document ───────────────────────────────────────────────────

  const updateDocumentTool = tool(
    async ({ content }: { content: string }) => {
      try {
        const db = await getDb();
        const table = documentType === "resume" ? "adapted_resumes" : "cover_letters";
        await db.execute(
          `INSERT INTO ${table} (job_id, content, updated_at)
           VALUES ($1, $2, datetime('now'))
           ON CONFLICT(job_id) DO UPDATE SET
             content = excluded.content,
             updated_at = excluded.updated_at`,
          [jobId, content],
        );
        onDocumentUpdated?.();
        return `Document saved successfully. The editor will refresh to show the updated content.`;
      } catch (err) {
        return `Error saving document: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    },
    {
      name: "update_document",
      description: `Save the FULL updated ${documentType} document. IMPORTANT: pass the COMPLETE document (not a diff or partial update). The content must be valid markdown.`,
      schema: z.object({
        content: z
          .string()
          .describe(`The FULL updated ${documentType} document in markdown format`),
      }),
    },
  );

  // ── Agent ─────────────────────────────────────────────────────────────

  const agent = createAgent({
    model: llm,
    tools: [
      readProfileTool,
      readExperiencesTool,
      readResumeDraftTool,
      readDocumentTool,
      updateDocumentTool,
    ],
    checkpointer,
  });

  return { agent };
}
