// src/stores/careerStore.ts
// ---------------------------------------------------------------------------
// Zustand store — single source of truth for the renderer.
// Career data is persisted in SQLite via @tauri-apps/plugin-sql.
// Structured data (profile, experiences, targetJob, resumeDraft) is the
// canonical source; markdown is derived on read and persisted alongside.
//
// Adapted from Electron version: window.electronAPI.* → service layer.
// Graph streaming (sendMessage/loadConversation) uses Tauri events.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import type { ColorProfile, AgentName, Experience, ResumeData } from "../../shared/state";
import { profileToMarkdown, resumeDataToMarkdown } from "../../shared/state";
import type { Conversation } from "../../services/conversation-service";

export interface JobChatContext {
  jobId: string;
  jobDescription: string | null;
  companyResearch: string | null;
  documentType: string | null;
  documentContent: string | null;
}
import { getDb } from "../../services/database";
import {
  getProfile,
  saveProfile,
  getExperiences,
  saveExperiences,
  getResumeDraft,
  saveResumeDraft,
} from "../../services/career-data-service";
import { getModel } from "../../shared/llm-provider";
import { SystemMessage, HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import {
  updateConversationTitleAuto,
  touchConversationAuto,
} from "../../services/conversation-service";
import { SqlCheckpointer } from "../../services/sql-checkpointer";
import { emptyCheckpoint } from "@langchain/langgraph-checkpoint";
import { v4 as uuid } from "uuid";
import { queryClient } from "../query-client";
import { streamAgentMessages } from "../../services/agent-session";
import { createProfileChatAgent } from "../../shared/agents/profileChatAgent";
import { createExperienceChatAgent } from "../../shared/agents/experienceChatAgent";
import { createResumeChatAgent } from "../../shared/agents/resumeChatAgent";
import { createJobChatAgent } from "../../shared/agents/jobChatAgent";

function emptyResumeData(): ResumeData {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    linkedin: "",
    otherNetworks: "",
    nationality: "",
    country: "",
    title: "",
    bannerHighlights: "",
    keySkills: [],
    education: [],
    languages: [],
  };
}

export function generateConversationTitle(firstMessage: string): string {
  const sanitized = firstMessage.replace(/\n/g, " ").trim();
  if (!sanitized) return "New Chat";
  return sanitized.length <= 60 ? sanitized : sanitized.slice(0, 60);
}

function isProfileNonEmpty(profile: Partial<ColorProfile>): boolean {
  if (profile.dominantColor !== undefined && profile.dominantColor !== "unknown") return true;
  if (profile.secondaryColor !== undefined) return true;
  if (profile.discProfile !== undefined && profile.discProfile !== "") return true;
  if (profile.careerDrivers && profile.careerDrivers.length > 0) return true;
  if (profile.workStylePreferences && profile.workStylePreferences.length > 0) return true;
  if (profile.values && profile.values.length > 0) return true;
  if (profile.riskAppetite !== undefined && profile.riskAppetite !== "unknown") return true;
  if (profile.riskProfileDetails && profile.riskProfileDetails !== "") return true;
  if (profile.changeToleranceNotes && profile.changeToleranceNotes !== "") return true;
  if (profile.rawInsights && profile.rawInsights !== "") return true;
  return false;
}

function isSentinelValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (value === "unknown") return true;
  if (value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function mergeProfile(
  existing: Partial<ColorProfile>,
  incoming: Partial<ColorProfile>,
): Partial<ColorProfile> {
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (!isSentinelValue(value)) {
      merged[key] = value;
    }
  }
  return merged as Partial<ColorProfile>;
}

function jsonSummary(value: unknown): string {
  if (value === undefined || value === null) return "not yet captured";
  if (typeof value === "string") return value || "not yet captured";
  if (Array.isArray(value)) {
    if (value.length === 0) return "none";
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function buildSystemPrompt(agent: AgentName, state: CareerStore): string {
  if (agent === "job") {
    const ctx = state.jobContext;
    const parts: string[] = [];
    if (ctx?.documentType) {
      parts.push(`Document Type: ${ctx.documentType}`);
    }
    if (ctx?.jobDescription) {
      parts.push(`Job Description:\n\`\`\`\n${ctx.jobDescription.slice(0, 2000)}\n\`\`\``);
    }
    if (ctx?.companyResearch) {
      parts.push(`Company Research:\n\`\`\`\n${ctx.companyResearch.slice(0, 2000)}\n\`\`\``);
    }
    // Profile summary (truncated)
    const profileSummary = state.profileMarkdown
      ? state.profileMarkdown.slice(0, 300)
      : "not yet captured";
    parts.push(`User Profile Summary:\n${profileSummary}`);
    // Experiences count
    const expCount = state.experiences.length;
    parts.push(`Work Experiences: ${expCount} experience(s) recorded`);
    // Resume draft status
    parts.push(`Reference Resume: ${state.resumeDraft ? "has draft" : "not started"}`);

    const contextBlock = parts.length > 0 ? `## Context\n${parts.join("\n\n")}` : "";

    return `You are an expert document editor and job application coach.
You help the user understand job descriptions, research companies, and prepare application materials.

TOOLS
You have access to tools to read and modify data:
- read_document: Read the CURRENT document shown in the editor. Call this FIRST each turn.
- read_profile: Read the user's full career personality profile
- read_experiences: Read the user's complete work experience history
- read_resume_draft: Read the user's reference resume (kitchen-sink version)
- update_document: Save the FULL updated document to the editor

CRITICAL — YOU MUST USE TOOLS
- Start EVERY turn by calling read_document to see the current document content.
- Call read_profile, read_experiences, or read_resume_draft when you need background.
- When asked to change a document, call update_document with the FULL updated document.
  Never return diffs or partial changes — always pass the complete document.
- You CANNOT save data by talking about it — calling update_document is mandatory.

${contextBlock}`;
  }

  const profileSummary = jsonSummary(state.profile);
  const experiencesSummary =
    state.experiences.length > 0
      ? state.experiences
          .map((e) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate})`)
          .join("; ")
      : "none";

  return `You are a helpful career coach. You help people discover their professional strengths, document their experience, and build great resumes.

Current profile: ${profileSummary}
Current experiences: ${experiencesSummary}
Resume: ${state.resumeDraft || "not started"}

Be warm, encouraging, and practical. Ask one question at a time.`;
}

export interface CareerStore {
  profileMarkdown: string;
  experienceMarkdown: string;
  resumeMarkdown: string;
  profile: Partial<ColorProfile>;
  experiences: Experience[];
  targetJob: string;
  resumeDraft: string;
  resumeData: ResumeData;
  messages: Array<{ type: string; content: string }>;
  activeAgent: AgentName;
  isStreaming: boolean;
  threadId: string;
  streamingReasoning: string;
  isReasoningPhase: boolean;
  conversationTitle: string;
  availableConversations: Conversation[];
  jobContext: JobChatContext | null;
  setJobContext: (context: JobChatContext | null) => void;
  documentUpdatedAt: number;
  setDocumentUpdated: (ts: number) => void;

  saveToDisk: (type: "profile" | "experience" | "resume") => Promise<void>;
  setProfileMarkdown: (md: string) => void;
  setExperienceMarkdown: (md: string) => void;
  setResumeMarkdown: (md: string) => void;
  sendMessage: (text: string, forceAgent?: AgentName) => Promise<void>;
  setProfileField: <K extends keyof ColorProfile>(key: K, value: ColorProfile[K]) => void;
  setProfileFields: (partial: Partial<ColorProfile>) => void;
  setResumeFields: (partial: Partial<ResumeData>) => void;
  mergeStreamResult: (result: {
    activeAgent: string;
    profile: Partial<ColorProfile>;
    experiences: Array<Record<string, unknown>>;
    targetJob: string;
    resumeDraft: string;
    messages: Array<{ type: string; content: string }>;
  }) => void;
  canAccessResume: () => boolean;
  setThreadId: (id: string) => void;

  setConversations: (conversations: Conversation[]) => void;
  loadConversation: (conversation: Conversation) => Promise<void>;
  startNewConversation: (conversation: Conversation) => void;
  initializeFromStorage: () => Promise<void>;
  resetChatState: () => void;

  addExperience: (experience: Experience) => void;
  updateExperience: (id: string, partial: Partial<Experience>) => void;
  removeExperience: (id: string) => void;
}

export const useCareerStore = create<CareerStore>((set, get) => ({
  profileMarkdown: "",
  experienceMarkdown: "",
  resumeMarkdown: "",
  profile: {},
  experiences: [],
  targetJob: "",
  resumeDraft: "",
  resumeData: emptyResumeData(),
  messages: [],
  activeAgent: "router" as AgentName,
  isStreaming: false,
  threadId: `session-${Date.now()}`,
  streamingReasoning: "",
  isReasoningPhase: false,
  conversationTitle: "New Chat",
  availableConversations: [],
  jobContext: null,
  documentUpdatedAt: 0,

  // ── Save a specific data type to SQLite ──────────────────────────────
  saveToDisk: async (type) => {
    const db = await getDb();
    const state = get();
    switch (type) {
      case "profile":
        await saveProfile(db, state.profile, state.profileMarkdown);
        break;
      case "experience":
        await saveExperiences(db, state.experiences);
        break;
      case "resume":
        await saveResumeDraft(db, state.resumeData);
        break;
    }
  },

  setProfileField: <K extends keyof ColorProfile>(key: K, value: ColorProfile[K]) => {
    get().setProfileFields({ [key]: value } as Partial<ColorProfile>);
  },

  setResumeFields: async (partial: Partial<ResumeData>) => {
    const state = get();
    const merged = { ...state.resumeData, ...partial };
    const resumeMarkdown = resumeDataToMarkdown(merged);
    set({ resumeData: merged, resumeMarkdown });

    try {
      const db = await getDb();
      await saveResumeDraft(db, merged);
    } catch (err) {
      console.error("[careerStore] setResumeFields — save failed:", err);
    }
  },

  setProfileFields: async (partial: Partial<ColorProfile>) => {
    const state = get();
    const mergedProfile = mergeProfile(state.profile, partial);
    const profileMarkdown = profileToMarkdown(mergedProfile);
    set({ profile: mergedProfile, profileMarkdown });

    // Persist structured data + markdown directly to SQLite
    try {
      const db = await getDb();
      await saveProfile(db, mergedProfile, profileMarkdown);
    } catch (err) {
      console.error("[careerStore] setProfileFields — save failed:", err);
    }
  },

  setProfileMarkdown: (md) => set({ profileMarkdown: md }),
  setExperienceMarkdown: (md) => set({ experienceMarkdown: md }),
  setResumeMarkdown: (md) => set({ resumeMarkdown: md }),

  // ── Send a chat message to the LLM ──────────────────────────────────
  sendMessage: async (_text: string, _forceAgent?: AgentName) => {
    const state = get();
    set({ isStreaming: true, streamingReasoning: "", isReasoningPhase: false });

    const isFirstMessage = state.messages.length === 0;
    const agent = _forceAgent ?? "router";

    // Show the user message immediately in the UI
    const userMsg = { type: "human", content: _text };
    set({ messages: [...state.messages, userMsg] });

    try {
      // Build LC messages from conversation history (before user message was added)
      const lcMessages: BaseMessage[] = [
        ...state.messages.map((m) =>
          m.type === "human" ? new HumanMessage(m.content) : new AIMessage(m.content),
        ),
        new HumanMessage(_text),
      ];

      if (agent === "profile") {
        const {
          agent: profileAgent,
          seedProfile,
          getProfile,
          setConversationMessages,
        } = await createProfileChatAgent();
        seedProfile(state.profile);
        setConversationMessages(lcMessages);

        const stream = await profileAgent.stream(
          { messages: lcMessages },
          { streamMode: "messages" },
        );
        await streamAgentMessages(stream, get().messages, (update) => set(update));

        const updatedProfile = getProfile();
        if (isProfileNonEmpty(updatedProfile)) {
          const merged = mergeProfile(state.profile, updatedProfile);
          const md = profileToMarkdown(merged);
          set({ profile: merged, profileMarkdown: md });
          try {
            const db = await getDb();
            await saveProfile(db, merged, md);
          } catch (err) {
            console.error("[careerStore] Failed to persist profile:", err);
          }
        }
      } else if (agent === "experience") {
        const {
          agent: expAgent,
          seedExperiences,
          getExperiences,
          setConversationMessages,
        } = await createExperienceChatAgent();
        seedExperiences(state.experiences);
        setConversationMessages(lcMessages);

        const stream = await expAgent.stream({ messages: lcMessages }, { streamMode: "messages" });
        await streamAgentMessages(stream, get().messages, (update) => set(update));

        const updatedExperiences = getExperiences();
        if (updatedExperiences.length > 0) {
          set({ experiences: updatedExperiences });
          try {
            const db = await getDb();
            await saveExperiences(db, updatedExperiences);
          } catch (err) {
            console.error("[careerStore] Failed to persist experiences:", err);
          }
        }
      } else if (agent === "resume") {
        const {
          agent: resumeAgent,
          seedResume,
          getResume,
          setConversationMessages,
        } = await createResumeChatAgent();
        seedResume(state.resumeData);
        setConversationMessages(lcMessages);

        const stream = await resumeAgent.stream(
          { messages: lcMessages },
          { streamMode: "messages" },
        );
        await streamAgentMessages(stream, get().messages, (update) => set(update));

        const updatedResume = getResume();
        if (updatedResume.firstName || updatedResume.title || updatedResume.keySkills.length > 0) {
          const md = resumeDataToMarkdown(updatedResume);
          set({ resumeData: updatedResume, resumeDraft: md, resumeMarkdown: md });
          try {
            const db = await getDb();
            await saveResumeDraft(db, updatedResume);
          } catch (err) {
            console.error("[careerStore] Failed to persist resume:", err);
          }
        }
      } else if (agent === "job") {
        const ctx = state.jobContext;
        if (!ctx) throw new Error("Job context required for job agent");

        const systemPrompt = buildSystemPrompt("job", state);
        const { agent: jobAgent } = await createJobChatAgent({
          jobId: ctx.jobId,
          documentType: (ctx.documentType as "resume" | "cover") ?? "resume",
          onDocumentUpdated: () => get().setDocumentUpdated(Date.now()),
        });

        const stream = await jobAgent.stream(
          { messages: [new SystemMessage(systemPrompt), ...lcMessages] },
          { streamMode: "messages" },
        );
        await streamAgentMessages(stream, get().messages, (update) => set(update));
      } else {
        const systemPrompt = buildSystemPrompt(agent, state);
        const model = await getModel(0.7, undefined, undefined, true);
        const stream = await model.stream([new SystemMessage(systemPrompt), ...lcMessages]);

        await streamAgentMessages(stream, get().messages, (update) => set(update));
      }

      // Auto-title the conversation on the first message
      if (isFirstMessage && state.threadId) {
        const title = generateConversationTitle(_text);
        set({ conversationTitle: title });
        updateConversationTitleAuto(state.threadId, title)
          .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
          .catch((err) => console.error("[careerStore] Failed to update conversation title:", err));
      }

      // Persist messages as a LangGraph checkpoint
      const currentState = get();
      if (currentState.threadId && currentState.messages.length > 0) {
        try {
          const db = await getDb();
          const checkpointer = new SqlCheckpointer(db);
          const checkpoint = emptyCheckpoint();
          checkpoint.id = uuid();
          checkpoint.channel_values = { messages: currentState.messages };
          await checkpointer.put(
            { configurable: { thread_id: currentState.threadId } },
            checkpoint,
            { source: "input", step: currentState.messages.length, parents: {} },
            {},
          );
          touchConversationAuto(currentState.threadId)
            .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
            .catch((err) => console.error("[careerStore] Failed to bump updated_at:", err));
        } catch (err) {
          console.error("[careerStore] Failed to persist messages:", err);
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
      const errorMsg = {
        type: "ai",
        content: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
      };
      set({ messages: [...get().messages, errorMsg] });
    } finally {
      set({ isStreaming: false, streamingReasoning: "", isReasoningPhase: false });
    }
  },

  mergeStreamResult: (result) => {
    const state = get();

    const rawMessages =
      result.messages && result.messages.length > 0 ? result.messages : state.messages;

    const validMessages = rawMessages.filter((msg) => {
      if (msg.content == null) return false;
      if (msg.type === "ai" && !msg.content) return false;
      if (msg.type === "tool") return false;
      return true;
    });
    const serverMessages = validMessages.filter(
      (msg, i, arr) => i === 0 || msg.content !== arr[i - 1].content,
    );

    const mergedProfile = mergeProfile(state.profile, result.profile);
    const hasProfileData = isProfileNonEmpty(mergedProfile);

    const mergedExperiences =
      result.experiences && result.experiences.length > 0
        ? (result.experiences as unknown as CareerStore["experiences"])
        : state.experiences;
    const mergedTargetJob = result.targetJob || state.targetJob;
    const mergedResumeDraft = result.resumeDraft || state.resumeDraft;

    const updates: Partial<CareerStore> = {
      activeAgent: result.activeAgent as AgentName,
      profile: mergedProfile,
      experiences: mergedExperiences,
      targetJob: mergedTargetJob,
      resumeDraft: mergedResumeDraft,
      messages: serverMessages,
    };

    if (hasProfileData) {
      updates.profileMarkdown = profileToMarkdown(mergedProfile);
    }

    set(updates);

    if (hasProfileData) {
      get().saveToDisk("profile");
    }
    if (result.experiences && result.experiences.length > 0) {
      get().saveToDisk("experience");
    }
    if (result.resumeDraft) {
      get().saveToDisk("resume");
    }
  },

  canAccessResume: () => {
    const state = get();
    const hasProfile =
      Object.keys(state.profile).length > 0 && state.profile.dominantColor !== undefined;
    const hasExperiences = state.experiences.length > 0;
    return hasProfile && hasExperiences;
  },

  setThreadId: (id) => set({ threadId: id }),
  setJobContext: (context) => set({ jobContext: context }),
  setDocumentUpdated: (ts) => set({ documentUpdatedAt: ts }),
  setConversations: (conversations) => set({ availableConversations: conversations }),

  loadConversation: async (conversation) => {
    try {
      // Load career data from SQLite
      const db = await getDb();
      const [sqliteProfile, sqliteExperiences, sqliteResume] = await Promise.all([
        getProfile(db),
        getExperiences(db),
        getResumeDraft(db),
      ]);

      // Load persisted messages from langgraph_checkpoints
      let loadedMessages: Array<{ type: string; content: string }> = [];
      try {
        const checkpointer = new SqlCheckpointer(db);
        const tuple = await checkpointer.getTuple({
          configurable: { thread_id: conversation.threadId },
        });
        if (tuple && tuple.checkpoint?.channel_values?.messages) {
          loadedMessages = tuple.checkpoint.channel_values.messages as Array<{
            type: string;
            content: string;
          }>;
        }
      } catch (err) {
        console.error("[careerStore] Failed to load messages from checkpoint:", err);
      }

      // Job-scoped conversations: skip career data loading
      if (conversation.type.startsWith("job:")) {
        set({
          threadId: conversation.threadId,
          conversationTitle: conversation.title,
          activeAgent: "job",
          messages: loadedMessages,
        });
        return;
      }

      const state = get();
      const mergedProfile = mergeProfile(state.profile, sqliteProfile ?? {});
      const hasProfileData = isProfileNonEmpty(mergedProfile);
      const mergedExperiences =
        sqliteExperiences.length > 0 ? sqliteExperiences : state.experiences;
      const mergedResumeData = sqliteResume ?? state.resumeData;
      const mergedResumeDraft = sqliteResume
        ? resumeDataToMarkdown(mergedResumeData)
        : state.resumeDraft;
      const mergedResumeMarkdown = sqliteResume
        ? resumeDataToMarkdown(mergedResumeData)
        : state.resumeMarkdown;

      set({
        threadId: conversation.threadId,
        conversationTitle: conversation.title,
        activeAgent: "router",
        profile: mergedProfile,
        experiences: mergedExperiences,
        resumeData: mergedResumeData,
        resumeDraft: mergedResumeDraft,
        resumeMarkdown: mergedResumeMarkdown,
        messages: loadedMessages,
        profileMarkdown: hasProfileData ? profileToMarkdown(mergedProfile) : "",
      });
    } catch (err) {
      console.error("[careerStore] loadConversation failed:", err);
      set({
        threadId: conversation.threadId,
        conversationTitle: conversation.title,
        messages: [],
        activeAgent: "router",
      });
    }
  },

  startNewConversation: (conversation) =>
    set({
      threadId: conversation.threadId,
      conversationTitle: conversation.title,
      messages: [],
      activeAgent: conversation.type.startsWith("job:") ? "job" : "router",
    }),

  initializeFromStorage: async () => {
    try {
      const db = await getDb();
      const [sqliteProfile, sqliteExperiences, sqliteResume] = await Promise.all([
        getProfile(db),
        getExperiences(db),
        getResumeDraft(db),
      ]);

      const state = get();
      const mergedProfile = mergeProfile(state.profile, sqliteProfile ?? {});
      const mergedExperiences =
        sqliteExperiences.length > 0 ? sqliteExperiences : state.experiences;
      const hasProfileData = isProfileNonEmpty(mergedProfile);
      const mergedResumeData = sqliteResume ?? state.resumeData;
      const mergedResumeDraft = sqliteResume
        ? resumeDataToMarkdown(mergedResumeData)
        : state.resumeDraft;
      const mergedResumeMarkdown = sqliteResume
        ? resumeDataToMarkdown(mergedResumeData)
        : state.resumeMarkdown;

      set({
        profile: mergedProfile,
        experiences: mergedExperiences,
        resumeData: mergedResumeData,
        resumeDraft: mergedResumeDraft,
        resumeMarkdown: mergedResumeMarkdown,
        profileMarkdown: hasProfileData ? profileToMarkdown(mergedProfile) : state.profileMarkdown,
      });
    } catch (err) {
      console.error("[careerStore] initializeFromStorage failed:", err);
    }
  },

  resetChatState: () =>
    set({
      messages: [],
      threadId: `session-${Date.now()}`,
      conversationTitle: "",
      activeAgent: "router" as AgentName,
      streamingReasoning: "",
      isReasoningPhase: false,
    }),

  addExperience: (experience) => {
    const state = get();
    set({ experiences: [...state.experiences, experience] });
    get().saveToDisk("experience");
  },

  updateExperience: (id, partial) => {
    const state = get();
    set({
      experiences: state.experiences.map((exp) => (exp.id === id ? { ...exp, ...partial } : exp)),
    });
    get().saveToDisk("experience");
  },

  removeExperience: (id) => {
    const state = get();
    set({
      experiences: state.experiences.filter((exp) => exp.id !== id),
    });
    get().saveToDisk("experience");
  },
}));
