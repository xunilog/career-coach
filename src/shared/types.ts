// shared/types.ts
// ---------------------------------------------------------------------------
// Shared TypeScript interfaces for the Job Search Module.
// These types correspond to the SQLite schema in db-schema.ts.
// ---------------------------------------------------------------------------

// ── Search Management ───────────────────────────────────────────────────────

export type Schedule = "manual" | "daily" | "weekly" | "monthly";

export interface SearchFilters {
  workplaceTypes?: string[];
  commitmentTypes?: string[];
  seniority?: string[];
  salaryMin?: number;
  salaryMax?: number;
  dateRange?: number; // days back from now
}

export interface SearchDefinition {
  id: string;
  title: string;
  location: string;
  country: string;
  schedule: Schedule;
  createdAt: string;
  lastRunAt: string | null;
  filters: SearchFilters;
}

export interface SearchInput {
  title: string;
  location: string;
  country?: string;
  schedule?: Schedule;
  filters?: SearchFilters;
}

export interface SearchUpdate {
  title?: string;
  location?: string;
  country?: string;
  schedule?: Schedule;
  filters?: SearchFilters;
}

// ── Job Posting ─────────────────────────────────────────────────────────────

export type Fit = "High" | "Medium" | "Low" | "Skip";

export type JobStatus =
  | "--"
  | "Saved"
  | "Applied 📤"
  | "Interview 🤝"
  | "Offer 🎉"
  | "Rejected ❌"
  | "Archived"
  | "Closed 🔒";

export interface JobPosting {
  id: string;
  searchId: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  fit: Fit | null;
  source: string;
  applyUrl: string | null;
  foundAt: string;
  status: JobStatus;
  description: string | null;
  notes: string | null;
  isNew: boolean;
}

// ── Company Research ────────────────────────────────────────────────────────

export interface KeyPerson {
  name: string;
  title: string;
  relevance: string;
}

export interface RecruiterContact {
  name: string;
  title: string;
  link: string;
}

export interface CompanyResearch {
  jobId: string;
  overview: string | null;
  culture: string | null;
  news: string | null;
  keyPeople: string | null;
  recruiters: RecruiterContact[] | null;
  market: string | null;
  relevance: string | null;
  generatedAt: string | null;
}

// ── Adapted Resume ──────────────────────────────────────────────────────────

export interface AdaptedResume {
  jobId: string;
  content: string | null;
  atsScore: number | null;
  humanScore: number | null;
  iterations: number | null;
  generatedAt: string | null;
  updatedAt: string | null;
}

// ── Cover Letter ────────────────────────────────────────────────────────────

export interface CoverLetter {
  jobId: string;
  content: string | null;
  atsScore: number | null;
  humanScore: number | null;
  iterations: number | null;
  generatedAt: string | null;
  updatedAt: string | null;
}

// ── Status History ──────────────────────────────────────────────────────────

export interface StatusHistoryEntry {
  id: number;
  jobId: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  changedAt: string;
}

// ── Generation State ────────────────────────────────────────────────────────

export type DocumentType = "resume" | "cover";

export interface GenerationState {
  documentType: DocumentType;
  draftContent: string;
  iteration: number;
  maxIterations: number;
  atsScore: number;
  humanScore: number;
  atsFeedback: string[];
  humanFeedback: string[];
  passedATS: boolean;
  passedReview: boolean;
}

// ── Stream Events ───────────────────────────────────────────────────────────

export type StreamEventType =
  | "start"
  | "phase"
  | "chunk"
  | "score"
  | "feedback"
  | "personalization"
  | "done"
  | "error";

export type StreamPhase = "searching" | "synthesizing" | "writing" | "scoring" | "reviewing";

export type StreamEvent =
  | { type: "start"; message: string }
  | { type: "phase"; phase: StreamPhase; message: string }
  | { type: "chunk"; content: string; phase?: StreamPhase }
  | { type: "score"; atsScore: number; humanScore: number; iteration: number }
  | { type: "feedback"; atsFeedback?: string[]; humanFeedback?: string[] }
  | { type: "personalization"; suggestions: string[] }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

// ── Search Execution ────────────────────────────────────────────────────────

export interface SearchState {
  title: string;
  location: string;
  country: string;
  filters: SearchFilters;
}

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  applyUrl: string;
  description: string;
  source: string;
}

export interface ScoredJob {
  jobId: string;
  fit: Fit;
  reason: string;
}
