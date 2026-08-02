// src/services/jobspy-client.ts
// ---------------------------------------------------------------------------
// JobSpyClient — job scraping via ts-jobspy.
//
// In Electron, this used ts-jobspy as a Node.js library. In Tauri, ts-jobspy
// (a Node.js package with Python bindings) cannot run in the webview.
//
// For now, this module requires a Python environment with ts-jobspy installed
// and uses @tauri-apps/plugin-shell to spawn it as a sidecar process.
//
// TODO: Replace with a Rust-based job scraper or a dedicated sidecar.
// ---------------------------------------------------------------------------

import type { SearchDefinition, SearchState, JobResult } from "../shared/types";

// ── Constants ───────────────────────────────────────────────────────────────

const RESULTS_PER_SITE = 100;

const JOB_TYPE_MAP: Record<string, string> = {
  "full-time": "fulltime",
  "part-time": "parttime",
  contract: "contract",
  internship: "internship",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "EUR ",
  GBP: "£",
};

const INTERVAL_SUFFIXES: Record<string, string> = {
  yearly: "/yr",
  monthly: "/mo",
  weekly: "/wk",
  daily: "/day",
  hourly: "/hr",
};

// ── Search state ────────────────────────────────────────────────────────────

export function buildSearchState(search: SearchDefinition): SearchState {
  return {
    title: search.title,
    location: search.location,
    country: search.country,
    filters: { ...search.filters },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(0)}k`;
  }
  return n.toString();
}

export function formatSalary(
  minAmount: number | null,
  maxAmount: number | null,
  currency: string | null,
  interval: string | null,
): string {
  if (minAmount == null && maxAmount == null) return "";

  const curr = currency ?? "USD";
  const symbol = CURRENCY_SYMBOLS[curr] ?? `${curr} `;

  const minStr = minAmount != null ? formatAmount(minAmount) : "";
  const maxStr = maxAmount != null ? formatAmount(maxAmount) : "";
  const range = minStr && maxStr ? `${minStr}-${maxStr}` : minStr || maxStr;

  const suffix = interval ? (INTERVAL_SUFFIXES[interval] ?? "") : "";
  return `${symbol}${range}${suffix}`;
}

// ── Main search function ─────────────────────────────────────────────────────

/**
 * Run a job search via the Python ts-jobspy package.
 *
 * Tauri note: ts-jobspy is a Node.js library that wraps Python. In the Tauri
 * webview, we cannot import Node.js modules directly. This function is
 * a stub that needs a proper sidecar implementation.
 *
 * See the migration plan for options:
 * - Write a thin Node.js script and call it via @tauri-apps/plugin-shell
 * - Write a Rust command using a Rust-based job scraper
 * - Use a local HTTP API wrapping the Python scraper
 */
export async function searchJobs(state: SearchState): Promise<JobResult[]> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  const args = ["../scripts/jobspy-sidecar.mjs"];
  args.push("--search-term", state.title);
  args.push("--location", state.location);
  args.push("--country", state.country);
  args.push("--results-wanted", String(RESULTS_PER_SITE * 2));
  args.push("--site", "linkedin");
  args.push("--site", "indeed");

  if (state.filters.workplaceTypes?.includes("Remote")) {
    args.push("--remote");
  }
  if (state.filters.commitmentTypes?.length) {
    const jobTypeKey = state.filters.commitmentTypes[0];
    args.push("--job-type", JOB_TYPE_MAP[jobTypeKey] ?? jobTypeKey);
  }
  if (state.filters.dateRange) {
    args.push("--hours-old", String(state.filters.dateRange * 24));
  }

  const cmd = Command.create("node", args);
  const output = await cmd.execute();

  if (output.code !== 0) {
    throw new Error(output.stderr || `Sidecar exited with code ${output.code}`);
  }

  const jobs = JSON.parse(output.stdout);
  return jobs.map((job: Record<string, unknown>) => ({
    id: (job.id as string) ?? "",
    title: (job.title as string) || state.title,
    company: (job.company as string) ?? "Unknown Company",
    location: (job.location as string) ?? state.location,
    salary: formatSalary(
      (job.minAmount as number | null) ?? null,
      (job.maxAmount as number | null) ?? null,
      (job.currency as string | null) ?? null,
      (job.interval as string | null) ?? null,
    ),
    applyUrl: (job.jobUrl as string) ?? "",
    description: (job.description as string) ?? "",
    source: (job.site as string) ?? "unknown",
  }));
}

// Export type mapping for use in the sidecar integration
export { JOB_TYPE_MAP, RESULTS_PER_SITE };
