import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSearchState } from "./jobspy-client";
import type { SearchDefinition, SearchState } from "../shared/types";

describe("buildSearchState", () => {
  it("copies title, location, country, and clones filters", () => {
    const def: SearchDefinition = {
      id: "s1",
      title: "Software Engineer",
      location: "New York",
      country: "usa",
      schedule: "daily",
      createdAt: "2026-01-01",
      lastRunAt: null,
      filters: { workplaceTypes: ["Remote"], commitmentTypes: ["full-time"] },
    };

    const state = buildSearchState(def);

    expect(state.title).toBe("Software Engineer");
    expect(state.location).toBe("New York");
    expect(state.country).toBe("usa");
    expect(state.filters).toEqual({ workplaceTypes: ["Remote"], commitmentTypes: ["full-time"] });
    expect(state.filters).not.toBe(def.filters);
  });
});

// ── searchJobs tests ────────────────────────────────────────────────────────

const mockExecute = vi.fn();
let mockCreateArgs: string[] = [];

vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    create: vi.fn((program: string, args: string[]) => {
      mockCreateArgs = [program, ...args];
      return { execute: mockExecute };
    }),
  },
}));

// Dynamic import so vi.mock hoists before the import resolves
const { searchJobs } = await import("./jobspy-client");

const sampleState: SearchState = {
  title: "Software Engineer",
  location: "New York",
  country: "usa",
  filters: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateArgs = [];
  mockExecute.mockResolvedValue({ stdout: "[]", stderr: "", code: 0 });
});

describe("searchJobs", () => {
  it("spawns the sidecar with --search-term and --location matching state", async () => {
    await searchJobs(sampleState);

    expect(mockCreateArgs[0]).toBe("node");
    const args = mockCreateArgs.slice(1);
    expect(args).toContain("--search-term");
    expect(args[args.indexOf("--search-term") + 1]).toBe("Software Engineer");
    expect(args).toContain("--location");
    expect(args[args.indexOf("--location") + 1]).toBe("New York");
  });

  it("passes --site linkedin and --site indeed", async () => {
    await searchJobs(sampleState);

    const args = mockCreateArgs.slice(1);
    expect(args).toContain("--site");
    const siteFlags = args.filter((_, i) => args[i - 1] === "--site");
    expect(siteFlags).toEqual(["linkedin", "indeed"]);
  });

  it("passes --results-wanted 200", async () => {
    await searchJobs(sampleState);

    const args = mockCreateArgs.slice(1);
    const idx = args.indexOf("--results-wanted");
    expect(Number(args[idx + 1])).toBe(200);
  });

  it("maps sidecar JSON output to JobResult[] with formatted salary", async () => {
    mockExecute.mockResolvedValue({
      stdout: JSON.stringify([
        {
          id: "j1",
          site: "linkedin",
          jobUrl: "https://linkedin.com/jobs/1",
          title: "Engineer",
          company: "Acme",
          location: "NYC",
          datePosted: "2026-06-01",
          interval: "yearly",
          minAmount: 100000,
          maxAmount: 150000,
          currency: "USD",
          description: "Great job",
          skills: "JS",
          jobUrlDirect: null,
          jobType: null,
          salarySource: null,
          isRemote: null,
          jobLevel: null,
          jobFunction: null,
          listingType: null,
          emails: null,
          companyIndustry: null,
          companyUrl: null,
          companyLogo: null,
          companyUrlDirect: null,
          companyAddresses: null,
          companyNumEmployees: null,
          companyRevenue: null,
          companyDescription: null,
          experienceRange: null,
          companyRating: null,
          companyReviewsCount: null,
          vacancyCount: null,
          workFromHomeType: null,
        },
        {
          id: "j2",
          site: "indeed",
          jobUrl: "https://indeed.com/jobs/2",
          title: "Senior Engineer",
          company: "BigCo",
          location: "Remote",
          datePosted: "2026-06-02",
          interval: null,
          minAmount: null,
          maxAmount: null,
          currency: null,
          description: "Another job",
          skills: "Go",
          jobUrlDirect: null,
          jobType: null,
          salarySource: null,
          isRemote: null,
          jobLevel: null,
          jobFunction: null,
          listingType: null,
          emails: null,
          companyIndustry: null,
          companyUrl: null,
          companyLogo: null,
          companyUrlDirect: null,
          companyAddresses: null,
          companyNumEmployees: null,
          companyRevenue: null,
          companyDescription: null,
          experienceRange: null,
          companyRating: null,
          companyReviewsCount: null,
          vacancyCount: null,
          workFromHomeType: null,
        },
      ]),
      stderr: "",
      code: 0,
    });

    const results = await searchJobs(sampleState);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("j1");
    expect(results[0].title).toBe("Engineer");
    expect(results[0].company).toBe("Acme");
    expect(results[0].applyUrl).toBe("https://linkedin.com/jobs/1");
    expect(results[0].salary).toBe("$100k-150k/yr");
    expect(results[0].description).toBe("Great job");

    expect(results[1].salary).toBe("");
  });

  it("throws with stderr message when sidecar exits non-zero", async () => {
    mockExecute.mockResolvedValue({ stdout: "", stderr: "Invalid args", code: 1 });
    await expect(searchJobs(sampleState)).rejects.toThrow("Invalid args");
  });

  it("throws when stdout is not valid JSON", async () => {
    mockExecute.mockResolvedValue({ stdout: "not-json", stderr: "", code: 0 });
    await expect(searchJobs(sampleState)).rejects.toThrow(SyntaxError);
  });

  it("maps workplaceTypes containing Remote to --remote flag", async () => {
    await searchJobs({ ...sampleState, filters: { workplaceTypes: ["Remote"] } });
    const args = mockCreateArgs.slice(1);
    expect(args).toContain("--remote");
  });

  it("maps commitmentTypes via JOB_TYPE_MAP", async () => {
    await searchJobs({ ...sampleState, filters: { commitmentTypes: ["full-time"] } });
    const args = mockCreateArgs.slice(1);
    const idx = args.indexOf("--job-type");
    expect(args[idx + 1]).toBe("fulltime");
  });

  it("maps dateRange (days) to --hours-old (hours)", async () => {
    await searchJobs({ ...sampleState, filters: { dateRange: 7 } });
    const args = mockCreateArgs.slice(1);
    const idx = args.indexOf("--hours-old");
    expect(Number(args[idx + 1])).toBe(168);
  });

  it("passes --country flag matching state.country", async () => {
    await searchJobs({ ...sampleState, country: "belgium" });
    const args = mockCreateArgs.slice(1);
    expect(args).toContain("--country");
    expect(args[args.indexOf("--country") + 1]).toBe("belgium");
  });
});
